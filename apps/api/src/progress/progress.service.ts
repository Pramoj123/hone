import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { prisma, Role, ProgramStatus } from '@hone/database';
import type { CurrentUserType } from '../common/decorators/current-user.decorator';

// ── Date helpers ─────────────────────────────────────────────────────────────

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseReps(actualReps: string | null | undefined): number {
  if (!actualReps) return 0;
  const n = parseFloat(actualReps);
  return isNaN(n) ? 0 : n;
}

function computeVolume(sets: number | null, reps: string | null, weight: number | null): number {
  return (sets ?? 0) * parseReps(reps) * (weight ?? 0);
}

function computeStreak(dates: Date[]): number {
  const dateSet = new Set(dates.map(toDateKey));
  const today = toDateKey(new Date());
  let streak = 0;

  for (let i = 0; i < 1000; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = toDateKey(d);
    if (dateSet.has(key)) {
      streak++;
    } else if (i === 0 && key === today) {
      // No workout today — streak starts from yesterday
      continue;
    } else {
      break;
    }
  }
  return streak;
}

function weekLabel(monday: Date): string {
  return `Week of ${monday.toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;
}

// ── Body metrics extraction ──────────────────────────────────────────────────

function extractBodyMetrics(assessments: Array<{ completedAt: Date | null; responses: unknown; template: { fields: unknown } }>) {
  const dates: string[] = [];
  const weight: (number | null)[] = [];
  const bodyFat: (number | null)[] = [];
  const waist: (number | null)[] = [];
  const chest: (number | null)[] = [];
  const hips: (number | null)[] = [];

  for (const a of assessments) {
    if (!a.completedAt) continue;
    const fields = (a.template.fields as Array<{ id: string; label: string }>) ?? [];
    const responses = (a.responses as Record<string, unknown>) ?? {};

    const labelMap = new Map(fields.map((f) => [f.id, f.label.toLowerCase()]));

    let w: number | null = null;
    let bf: number | null = null;
    let wt: number | null = null;
    let ch: number | null = null;
    let hp: number | null = null;

    for (const [fieldId, rawVal] of Object.entries(responses)) {
      const label = labelMap.get(fieldId) ?? '';
      const val = parseFloat(String(rawVal));
      if (isNaN(val)) continue;

      if (label.includes('weight') && !label.includes('body')) w = val;
      else if (label.includes('body fat') || label.includes('bodyfat') || label.includes('fat %')) bf = val;
      else if (label.includes('waist')) wt = val;
      else if (label.includes('chest')) ch = val;
      else if (label.includes('hip')) hp = val;
    }

    dates.push(a.completedAt.toISOString());
    weight.push(w);
    bodyFat.push(bf);
    waist.push(wt);
    chest.push(ch);
    hips.push(hp);
  }

  return { dates, weight, bodyFat, waist, chest, hips };
}

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ProgressService {
  // ── Member: summary ─────────────────────────────────────────────────────

  async getSummary(userId: string) {
    const now = new Date();

    // Start of current week (Monday UTC)
    const weekStart = getWeekStart(now);

    // Start of current month (UTC)
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    // 30 days ago
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

    const [allDates, workoutsThisMonth, weekLogs, totalPrograms, completedPrograms] = await Promise.all([
      prisma.workoutLog.findMany({
        where: { clientId: userId },
        select: { completedAt: true },
        orderBy: { completedAt: 'desc' },
      }),
      prisma.workoutLog.count({
        where: { clientId: userId, completedAt: { gte: monthStart } },
      }),
      prisma.workoutLog.findMany({
        where: { clientId: userId, completedAt: { gte: weekStart } },
        select: { actualSets: true, actualReps: true, actualWeightKg: true },
      }),
      prisma.workoutProgram.count({
        where: {
          clientId: userId,
          scheduledDate: { gte: thirtyDaysAgo, lte: now },
          deletedAt: null,
        },
      }),
      prisma.workoutProgram.count({
        where: {
          clientId: userId,
          scheduledDate: { gte: thirtyDaysAgo, lte: now },
          status: ProgramStatus.COMPLETED,
          deletedAt: null,
        },
      }),
    ]);

    const currentStreak = computeStreak(allDates.map((l) => l.completedAt));

    const volumeThisWeek = Math.round(
      weekLogs.reduce((sum, l) => sum + computeVolume(l.actualSets, l.actualReps, l.actualWeightKg), 0),
    );

    const complianceLast30Days = {
      totalPrograms,
      completed: completedPrograms,
      compliance: totalPrograms === 0 ? 0 : Math.round((completedPrograms / totalPrograms) * 100),
    };

    return { currentStreak, workoutsThisMonth, volumeThisWeek, complianceLast30Days };
  }

  // ── Member: volume by week ───────────────────────────────────────────────

  async getVolume(userId: string, weeks = 8) {
    const clampedWeeks = Math.min(Math.max(weeks, 1), 52);
    const now = new Date();
    const currentWeekStart = getWeekStart(now);
    const since = new Date(currentWeekStart.getTime() - (clampedWeeks - 1) * 7 * 86400000);

    const logs = await prisma.workoutLog.findMany({
      where: { clientId: userId, completedAt: { gte: since } },
      select: { completedAt: true, actualSets: true, actualReps: true, actualWeightKg: true },
    });

    // Build week buckets
    type WeekBucket = { totalVolume: number; sessionDates: Set<string> };
    const weekMap = new Map<string, WeekBucket>();

    for (const log of logs) {
      const ws = getWeekStart(log.completedAt);
      const key = toDateKey(ws);
      if (!weekMap.has(key)) weekMap.set(key, { totalVolume: 0, sessionDates: new Set() });
      const bucket = weekMap.get(key)!;
      bucket.totalVolume += computeVolume(log.actualSets, log.actualReps, log.actualWeightKg);
      bucket.sessionDates.add(toDateKey(log.completedAt));
    }

    const data = Array.from({ length: clampedWeeks }, (_, i) => {
      const ws = new Date(currentWeekStart.getTime() - (clampedWeeks - 1 - i) * 7 * 86400000);
      ws.setUTCHours(0, 0, 0, 0);
      const key = toDateKey(ws);
      const bucket = weekMap.get(key);
      return {
        week: weekLabel(ws),
        weekStart: key,
        totalVolume: Math.round(bucket?.totalVolume ?? 0),
        sessionCount: bucket?.sessionDates.size ?? 0,
      };
    });

    return { data };
  }

  // ── Member: personal records ─────────────────────────────────────────────

  async getPRs(userId: string) {
    const logs = await prisma.workoutLog.findMany({
      where: { clientId: userId, actualWeightKg: { not: null } },
      select: {
        actualWeightKg: true,
        actualReps: true,
        actualSets: true,
        completedAt: true,
        program: { select: { workout: { select: { id: true, name: true } } } },
      },
    });

    type PREntry = {
      workoutId: string;
      workoutName: string;
      maxWeightKg: number;
      repsAtMaxWeight: number;
      estimated1RM: number;
      achievedAt: Date;
    };

    const prMap = new Map<string, PREntry>();

    for (const log of logs) {
      const workoutId = log.program.workout.id;
      const weight = log.actualWeightKg!;
      const reps = parseReps(log.actualReps);
      const existing = prMap.get(workoutId);

      const isBetter =
        !existing ||
        weight > existing.maxWeightKg ||
        (weight === existing.maxWeightKg && log.completedAt > existing.achievedAt);

      if (isBetter) {
        prMap.set(workoutId, {
          workoutId,
          workoutName: log.program.workout.name,
          maxWeightKg: weight,
          repsAtMaxWeight: reps,
          estimated1RM: Math.round((weight * (1 + reps / 30)) * 10) / 10,
          achievedAt: log.completedAt,
        });
      }
    }

    const data = [...prMap.values()].sort(
      (a, b) => b.achievedAt.getTime() - a.achievedAt.getTime(),
    );

    return { data };
  }

  // ── Member: exercise history for a single workout ────────────────────────

  async getExerciseLogs(userId: string, workoutId: string) {
    const [workout, logs] = await Promise.all([
      prisma.workout.findFirst({
        where: { id: workoutId, deletedAt: null },
        select: { id: true, name: true },
      }),
      prisma.workoutLog.findMany({
        where: { clientId: userId, program: { workoutId } },
        select: {
          completedAt: true,
          actualSets: true,
          actualReps: true,
          actualWeightKg: true,
          actualDurationMinutes: true,
          rpe: true,
        },
        orderBy: { completedAt: 'asc' },
      }),
    ]);

    if (!workout) throw new NotFoundException('Workout not found');

    const enrichedLogs = logs.map((l) => ({
      ...l,
      volumePerSession: computeVolume(l.actualSets, l.actualReps, l.actualWeightKg),
    }));

    return { workout, logs: enrichedLogs };
  }

  // ── Member: streak / activity heatmap ───────────────────────────────────

  async getStreakHistory(userId: string, days = 90) {
    const clampedDays = Math.min(Math.max(days, 1), 365);
    const since = new Date(Date.now() - clampedDays * 86400000);

    const logs = await prisma.workoutLog.findMany({
      where: { clientId: userId, completedAt: { gte: since } },
      select: { completedAt: true },
    });

    const sessionMap = new Map<string, number>();
    for (const log of logs) {
      const key = toDateKey(log.completedAt);
      sessionMap.set(key, (sessionMap.get(key) ?? 0) + 1);
    }

    const now = new Date();
    const data = Array.from({ length: clampedDays }, (_, i) => {
      const d = new Date(now);
      d.setUTCDate(now.getUTCDate() - (clampedDays - 1 - i));
      d.setUTCHours(0, 0, 0, 0);
      const date = toDateKey(d);
      const count = sessionMap.get(date) ?? 0;
      return { date, hasSession: count > 0, sessionCount: count };
    });

    return { data };
  }

  // ── Trainer: member progress ─────────────────────────────────────────────

  async getMemberProgress(memberId: string, orgId: string, viewer: CurrentUserType, weeks = 12) {
    // Verify member belongs to org and is reachable by viewer
    const member = await prisma.user.findFirst({
      where: {
        id: memberId,
        role: Role.CLIENT,
        deletedAt: null,
        branch: { organizationId: orgId },
        ...(
          (viewer.role === Role.TRAINER || viewer.role === Role.BRANCH_MANAGER) && viewer.branchId
            ? { branchId: viewer.branchId }
            : {}
        ),
      },
      select: { id: true },
    });
    if (!member) throw new NotFoundException('Member not found');

    const now = new Date();

    // Compliance for last 30 / 60 / 90 days
    const compliancePeriods = [30, 60, 90] as const;
    const complianceResults = await Promise.all(
      compliancePeriods.map(async (days) => {
        const since = new Date(now.getTime() - days * 86400000);
        const [total, completed, missed] = await Promise.all([
          prisma.workoutProgram.count({
            where: { clientId: memberId, scheduledDate: { gte: since, lte: now }, deletedAt: null },
          }),
          prisma.workoutProgram.count({
            where: { clientId: memberId, scheduledDate: { gte: since, lte: now }, status: ProgramStatus.COMPLETED, deletedAt: null },
          }),
          prisma.workoutProgram.count({
            where: { clientId: memberId, scheduledDate: { gte: since, lt: now }, status: ProgramStatus.PENDING, deletedAt: null },
          }),
        ]);
        return [days, { total, completed, missed, complianceRate: total === 0 ? 0 : Math.round((completed / total) * 100) }] as const;
      }),
    );

    const compliance = Object.fromEntries(
      complianceResults.map(([days, val]) => [`last${days}`, val]),
    );

    // Body metrics from assessments
    const assessments = await prisma.assessment.findMany({
      where: { clientId: memberId, completedAt: { not: null } },
      include: { template: { select: { fields: true } } },
      orderBy: { completedAt: 'asc' },
    });
    const bodyMetrics = extractBodyMetrics(assessments);

    // Volume by week
    const { data: workoutVolume } = await this.getVolume(memberId, weeks);

    // PRs
    const { data: prs } = await this.getPRs(memberId);

    // Session RPE timeline
    const rpeLogs = await prisma.workoutLog.findMany({
      where: { clientId: memberId },
      select: { completedAt: true, rpe: true },
      orderBy: { completedAt: 'asc' },
    });

    const sessionRpe = {
      dates: rpeLogs.map((l) => l.completedAt.toISOString()),
      rpeValues: rpeLogs.map((l) => l.rpe ?? null),
    };

    return { compliance, bodyMetrics, workoutVolume, prs, sessionRpe };
  }

  // ── Analytics: org-level compliance dashboard ────────────────────────────

  async getComplianceAnalytics(orgId: string, viewer: CurrentUserType, period = 30) {
    const since = new Date(Date.now() - period * 86400000);
    const now = new Date();
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000);

    // Scope to branch for BRANCH_MANAGER
    const branchScope =
      viewer.role === Role.BRANCH_MANAGER && viewer.branchId
        ? { branchId: viewer.branchId }
        : { branch: { organizationId: orgId } };

    // All clients in scope
    const clients = await prisma.user.findMany({
      where: { role: Role.CLIENT, deletedAt: null, ...branchScope },
      select: { id: true },
    });
    const clientIds = clients.map((c) => c.id);

    if (clientIds.length === 0) {
      return {
        overview: { avgComplianceRate: 0, totalSessions: 0, activeClientCount: 0, atRiskCount: 0 },
        byTrainer: [],
        topWorkouts: [],
        activityByDay: { MON: 0, TUE: 0, WED: 0, THU: 0, FRI: 0, SAT: 0, SUN: 0 },
      };
    }

    // All trainers in scope
    const trainers = await prisma.user.findMany({
      where: { role: Role.TRAINER, deletedAt: null, ...branchScope },
      select: { id: true, name: true },
    });

    // Overall program stats
    const [totalPrograms, completedPrograms] = await Promise.all([
      prisma.workoutProgram.count({
        where: { clientId: { in: clientIds }, scheduledDate: { gte: since, lte: now }, deletedAt: null },
      }),
      prisma.workoutProgram.count({
        where: { clientId: { in: clientIds }, scheduledDate: { gte: since, lte: now }, status: ProgramStatus.COMPLETED, deletedAt: null },
      }),
    ]);

    // Overall session logs in period
    const periodLogs = await prisma.workoutLog.findMany({
      where: { clientId: { in: clientIds }, completedAt: { gte: since } },
      select: { clientId: true, completedAt: true, program: { select: { workoutId: true } } },
    });

    const activeClientIds = new Set(periodLogs.map((l) => l.clientId));

    // At-risk clients: 0 sessions in last 14 days
    const recentLogs = await prisma.workoutLog.findMany({
      where: { clientId: { in: clientIds }, completedAt: { gte: twoWeeksAgo } },
      select: { clientId: true },
    });
    const recentClientIds = new Set(recentLogs.map((l) => l.clientId));
    const atRiskCount = clientIds.filter((id) => !recentClientIds.has(id)).length;

    // Top 5 workouts by log count
    const workoutCounts = new Map<string, number>();
    for (const log of periodLogs) {
      const wid = log.program.workoutId;
      workoutCounts.set(wid, (workoutCounts.get(wid) ?? 0) + 1);
    }
    const topWorkoutIds = [...workoutCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    const topWorkoutDetails =
      topWorkoutIds.length > 0
        ? await prisma.workout.findMany({
            where: { id: { in: topWorkoutIds } },
            select: { id: true, name: true },
          })
        : [];

    const topWorkouts = topWorkoutIds.map((id) => ({
      workoutId: id,
      workoutName: topWorkoutDetails.find((w) => w.id === id)?.name ?? id,
      logCount: workoutCounts.get(id) ?? 0,
    }));

    // Activity by day of week (0=Sun in JS)
    const DOW_KEYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
    const activityByDay = Object.fromEntries(DOW_KEYS.map((k) => [k, 0])) as Record<typeof DOW_KEYS[number], number>;
    for (const log of periodLogs) {
      const dow = new Date(log.completedAt).getUTCDay();
      activityByDay[DOW_KEYS[dow]]++;
    }

    // Per-trainer stats
    const byTrainer = await Promise.all(
      trainers.map(async (trainer) => {
        // Clients who have programs assigned by this trainer
        const trainerPrograms = await prisma.workoutProgram.findMany({
          where: {
            trainerId: trainer.id,
            clientId: { in: clientIds },
            scheduledDate: { gte: since, lte: now },
            deletedAt: null,
          },
          select: { clientId: true, status: true },
        });

        const trainerClientIds = [...new Set(trainerPrograms.map((p) => p.clientId))];
        const trainerTotal = trainerPrograms.length;
        const trainerCompleted = trainerPrograms.filter((p) => p.status === ProgramStatus.COMPLETED).length;

        const trainerRecentLogs = await prisma.workoutLog.findMany({
          where: { clientId: { in: trainerClientIds }, completedAt: { gte: twoWeeksAgo } },
          select: { clientId: true },
        });
        const trainerRecentClientIds = new Set(trainerRecentLogs.map((l) => l.clientId));
        const atRiskClients = trainerClientIds.filter((id) => !trainerRecentClientIds.has(id)).length;

        const trainerPeriodLogs = await prisma.workoutLog.count({
          where: { clientId: { in: trainerClientIds }, completedAt: { gte: since } },
        });

        return {
          trainerId: trainer.id,
          trainerName: trainer.name,
          clientCount: trainerClientIds.length,
          avgComplianceRate: trainerTotal === 0 ? 0 : Math.round((trainerCompleted / trainerTotal) * 100),
          totalSessionsCompleted: trainerPeriodLogs,
          atRiskClients,
        };
      }),
    );

    return {
      overview: {
        avgComplianceRate: totalPrograms === 0 ? 0 : Math.round((completedPrograms / totalPrograms) * 100),
        totalSessions: periodLogs.length,
        activeClientCount: activeClientIds.size,
        atRiskCount,
      },
      byTrainer,
      topWorkouts,
      activityByDay,
    };
  }
}
