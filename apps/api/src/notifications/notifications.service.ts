import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma, Role, ProgramStatus } from '@hone/database';
import { EmailService } from './email.service';
import { programAssignedTemplate } from './templates/program-assigned.template';
import { assessmentAssignedTemplate } from './templates/assessment-assigned.template';
import { assessmentSubmittedTemplate } from './templates/assessment-submitted.template';
import { weeklySummaryTemplate } from './templates/weekly-summary.template';

// ── Streak helper (mirrors logic in progress.service.ts) ──────────────────────

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computeStreak(completedDates: Date[]): number {
  const dateSet = new Set(completedDates.map(toDateKey));
  let streak = 0;
  for (let i = 0; i < 1000; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    if (dateSet.has(toDateKey(d))) {
      streak++;
    } else if (i === 0) {
      // No session today — start checking from yesterday
      continue;
    } else {
      break;
    }
  }
  return streak;
}

// ── Week boundary helpers ─────────────────────────────────────────────────────

function getLastWeekBounds(): { lastMonday: Date; lastSunday: Date } {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const dow = today.getUTCDay(); // 0=Sun
  const daysToThisMonday = dow === 0 ? 6 : dow - 1;
  const thisMonday = new Date(today);
  thisMonday.setUTCDate(today.getUTCDate() - daysToThisMonday);

  const lastMonday = new Date(thisMonday);
  lastMonday.setUTCDate(thisMonday.getUTCDate() - 7);

  const lastSunday = new Date(lastMonday);
  lastSunday.setUTCDate(lastMonday.getUTCDate() + 6);
  lastSunday.setUTCHours(23, 59, 59, 999);

  return { lastMonday, lastSunday };
}

function parseReps(reps: string | null | undefined): number {
  if (!reps) return 0;
  const n = parseFloat(reps);
  return isNaN(n) ? 0 : n;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly webUrl: string;
  private readonly adminUrl: string;

  constructor(
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {
    this.webUrl = config.get<string>('APP_WEB_URL', 'http://localhost:3000');
    this.adminUrl = config.get<string>('APP_ADMIN_URL', 'http://localhost:3002');
  }

  // ── Trigger: program assigned ─────────────────────────────────────────────

  async onProgramAssigned(programId: string): Promise<void> {
    const program = await prisma.workoutProgram.findUnique({
      where: { id: programId },
      select: {
        id: true,
        scheduledDate: true,
        targetSets: true,
        targetReps: true,
        targetDurationMinutes: true,
        client: {
          select: {
            name: true,
            email: true,
            branch: {
              select: {
                organization: { select: { name: true, slug: true, timezone: true } },
              },
            },
          },
        },
        trainer: { select: { name: true } },
        workout: { select: { name: true, muscleGroups: true, durationMinutes: true } },
      },
    });

    if (!program?.client?.email) {
      this.logger.warn(`onProgramAssigned: client has no email — program ${programId}`);
      return;
    }

    const org = program.client.branch?.organization;
    const tz = org?.timezone ?? 'UTC';

    const scheduledDate = program.scheduledDate
      ? new Intl.DateTimeFormat('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          timeZone: tz,
        }).format(program.scheduledDate)
      : 'TBD';

    const { subject, html } = programAssignedTemplate({
      memberName: program.client.name,
      trainerName: program.trainer?.name ?? 'Your trainer',
      gymName: org?.name ?? 'Your gym',
      workoutName: program.workout.name,
      scheduledDate,
      targetSets: program.targetSets ? parseInt(program.targetSets, 10) : null,
      targetReps: program.targetReps ? parseInt(program.targetReps, 10) : null,
      targetDurationMinutes: program.targetDurationMinutes ?? program.workout.durationMinutes,
      muscleGroups: (program.workout.muscleGroups as string[]) ?? [],
      programDetailUrl: `${this.webUrl}/dashboard/programs/${programId}`,
    });

    const result = await this.email.send({ to: program.client.email, subject, html });
    if (result) {
      this.logger.log(`program-assigned sent to ${program.client.email} (id=${result.id})`);
    }
  }

  // ── Trigger: assessment assigned ──────────────────────────────────────────

  async onAssessmentAssigned(assessmentId: string): Promise<void> {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        scheduledDate: true,
        client: { select: { name: true, email: true } },
        trainer: { select: { name: true } },
        template: { select: { name: true, fields: true } },
        organization: { select: { name: true, timezone: true } },
      },
    });

    if (!assessment?.client?.email) {
      this.logger.warn(`onAssessmentAssigned: client has no email — assessment ${assessmentId}`);
      return;
    }

    const tz = assessment.organization?.timezone ?? 'UTC';
    const fields = assessment.template.fields as Array<{ id: string }>;

    const scheduledDate = assessment.scheduledDate
      ? new Intl.DateTimeFormat('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          timeZone: tz,
        }).format(assessment.scheduledDate)
      : null;

    const { subject, html } = assessmentAssignedTemplate({
      memberName: assessment.client.name,
      trainerName: assessment.trainer?.name ?? 'Your trainer',
      gymName: assessment.organization?.name ?? 'Your gym',
      templateName: assessment.template.name,
      scheduledDate,
      fieldCount: fields.length,
      assessmentUrl: `${this.webUrl}/dashboard/assessments/${assessmentId}`,
    });

    const result = await this.email.send({ to: assessment.client.email, subject, html });
    if (result) {
      this.logger.log(`assessment-assigned sent to ${assessment.client.email} (id=${result.id})`);
    }
  }

  // ── Trigger: assessment submitted (notify trainer) ────────────────────────

  async onAssessmentSubmitted(assessmentId: string): Promise<void> {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        completedAt: true,
        responses: true,
        client: { select: { name: true } },
        trainer: { select: { name: true, email: true } },
        template: { select: { name: true, fields: true } },
        organization: { select: { name: true, slug: true, timezone: true } },
      },
    });

    if (!assessment?.trainer?.email) {
      this.logger.warn(`onAssessmentSubmitted: no trainer email — assessment ${assessmentId}`);
      return;
    }

    const tz = assessment.organization?.timezone ?? 'UTC';
    const fields = assessment.template.fields as Array<{ id: string; label: string; unit?: string }>;
    const responses = (assessment.responses ?? {}) as Record<string, unknown>;

    // Build preview from first 4 template fields
    const responsesSummary = fields.slice(0, 4).map((f) => {
      const val = responses[f.id];
      return {
        label: f.label,
        value: val != null && val !== '' ? String(val) : '—',
        unit: f.unit,
      };
    });

    const submittedAt = assessment.completedAt
      ? new Intl.DateTimeFormat('en-US', {
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: tz,
        }).format(assessment.completedAt)
      : 'recently';

    const orgSlug = assessment.organization?.slug;
    const reviewUrl = orgSlug
      ? `${this.adminUrl}/${orgSlug}/assessments`
      : `${this.adminUrl}/assessments`;

    const { subject, html } = assessmentSubmittedTemplate({
      trainerName: assessment.trainer.name,
      memberName: assessment.client.name,
      gymName: assessment.organization?.name ?? 'Your gym',
      templateName: assessment.template.name,
      submittedAt,
      reviewUrl,
      responsesSummary,
    });

    const result = await this.email.send({ to: assessment.trainer.email, subject, html });
    if (result) {
      this.logger.log(`assessment-submitted sent to ${assessment.trainer.email} (id=${result.id})`);
    }
  }

  // ── Batch: weekly summary for all members (called by cron) ────────────────

  async sendWeeklySummaryToAll(): Promise<{ sent: number; failed: number }> {
    const { lastMonday, lastSunday } = getLastWeekBounds();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const clients = await prisma.user.findMany({
      where: {
        role: Role.CLIENT,
        deletedAt: null,
        programsAsClient: { some: {} }, // at least 1 program ever
      },
      select: {
        id: true,
        name: true,
        email: true,
        branch: {
          select: {
            organization: { select: { name: true, timezone: true } },
          },
        },
      },
    });

    let sent = 0;
    let failed = 0;
    const BATCH = 10;

    for (let i = 0; i < clients.length; i += BATCH) {
      const batch = clients.slice(i, i + BATCH);

      const results = await Promise.allSettled(
        batch.map((client) =>
          this.sendWeeklySummaryToClient(client, lastMonday, lastSunday, today),
        ),
      );

      for (const res of results) {
        if (res.status === 'fulfilled') {
          if (res.value) sent++;
        } else {
          this.logger.error('sendWeeklySummaryToAll batch error', res.reason);
          failed++;
        }
      }
    }

    this.logger.log(`sendWeeklySummaryToAll complete — sent=${sent} failed=${failed}`);
    return { sent, failed };
  }

  // ── Test helper (no DB lookup) ────────────────────────────────────────────

  async sendTestEmail(
    to: string,
    type: 'program-assigned' | 'assessment-assigned' | 'assessment-submitted' | 'weekly-summary',
  ): Promise<string | null> {
    const tomorrow = new Date(Date.now() + 86400000);
    const scheduledDate = new Intl.DateTimeFormat('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    }).format(tomorrow);

    let subject: string;
    let html: string;

    if (type === 'program-assigned') {
      ({ subject, html } = programAssignedTemplate({
        memberName: 'Alex Johnson',
        trainerName: 'Coach Sam',
        gymName: 'Hone Fitness',
        workoutName: 'Barbell Back Squat',
        scheduledDate,
        targetSets: 4,
        targetReps: 8,
        targetDurationMinutes: 45,
        muscleGroups: ['Quadriceps', 'Glutes', 'Hamstrings'],
        programDetailUrl: `${this.webUrl}/dashboard/programs/sample`,
      }));
    } else if (type === 'assessment-assigned') {
      ({ subject, html } = assessmentAssignedTemplate({
        memberName: 'Alex Johnson',
        trainerName: 'Coach Sam',
        gymName: 'Hone Fitness',
        templateName: 'Monthly Body Composition Check',
        scheduledDate,
        fieldCount: 8,
        assessmentUrl: `${this.webUrl}/dashboard/assessments/sample`,
      }));
    } else if (type === 'assessment-submitted') {
      const now = new Intl.DateTimeFormat('en-US', {
        month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
      }).format(new Date());
      ({ subject, html } = assessmentSubmittedTemplate({
        trainerName: 'Coach Sam',
        memberName: 'Alex Johnson',
        gymName: 'Hone Fitness',
        templateName: 'Monthly Body Composition Check',
        submittedAt: now,
        reviewUrl: `${this.adminUrl}/hone/assessments`,
        responsesSummary: [
          { label: 'Body weight', value: '82.5', unit: 'kg' },
          { label: 'Body fat %', value: '18.2', unit: '%' },
          { label: 'Waist circumference', value: '84', unit: 'cm' },
          { label: 'Energy levels (1-10)', value: '7' },
        ],
      }));
    } else {
      ({ subject, html } = weeklySummaryTemplate({
        memberName: 'Alex Johnson',
        gymName: 'Hone Fitness',
        weekLabel: 'Week of June 2',
        workoutsCompleted: 4,
        workoutsMissed: 1,
        totalVolumeKg: 3840,
        currentStreak: 12,
        upcomingWorkouts: [
          { workoutName: 'Upper Body Push', scheduledDate: 'Monday' },
          { workoutName: 'Lower Body Pull', scheduledDate: 'Wednesday' },
          { workoutName: 'Full Body HIIT', scheduledDate: 'Friday' },
        ],
        progressUrl: `${this.webUrl}/dashboard/progress`,
      }));
    }

    const result = await this.email.send({ to, subject, html });
    return result?.id ?? null;
  }

  // ── Private: single-client weekly summary ────────────────────────────────

  private async sendWeeklySummaryToClient(
    client: {
      id: string;
      name: string;
      email: string;
      branch: { organization: { name: string; timezone: string } | null } | null;
    },
    lastMonday: Date,
    lastSunday: Date,
    today: Date,
  ): Promise<boolean> {
    if (!client.email) return false;

    const [logs, missedCount, upcomingPrograms, allLogDates] = await Promise.all([
      // Logs completed last week
      prisma.workoutLog.findMany({
        where: { clientId: client.id, completedAt: { gte: lastMonday, lte: lastSunday } },
        select: { actualSets: true, actualReps: true, actualWeightKg: true },
      }),
      // Missed (PENDING past scheduledDate in last week window)
      prisma.workoutProgram.count({
        where: {
          clientId: client.id,
          status: ProgramStatus.PENDING,
          scheduledDate: { gte: lastMonday, lte: lastSunday },
          deletedAt: null,
        },
      }),
      // Next 3 upcoming
      prisma.workoutProgram.findMany({
        where: {
          clientId: client.id,
          status: ProgramStatus.PENDING,
          scheduledDate: { gte: today },
          deletedAt: null,
        },
        select: {
          scheduledDate: true,
          workout: { select: { name: true } },
        },
        orderBy: { scheduledDate: 'asc' },
        take: 3,
      }),
      // All log dates for streak
      prisma.workoutLog.findMany({
        where: { clientId: client.id },
        select: { completedAt: true },
        orderBy: { completedAt: 'desc' },
      }),
    ]);

    const workoutsCompleted = logs.length;
    const workoutsMissed = missedCount;
    const upcoming = upcomingPrograms;

    // Skip members with no activity at all this period
    if (workoutsCompleted === 0 && workoutsMissed === 0 && upcoming.length === 0) {
      return false;
    }

    const totalVolumeKg = Math.round(
      logs.reduce((sum, l) => sum + (l.actualSets ?? 0) * parseReps(l.actualReps) * (l.actualWeightKg ?? 0), 0),
    );

    const currentStreak = computeStreak(allLogDates.map((l) => l.completedAt));

    const org = client.branch?.organization;
    const tz = org?.timezone ?? 'UTC';

    const weekLabel = `Week of ${new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      timeZone: tz,
    }).format(lastMonday)}`;

    const upcomingWorkouts = upcoming.map((p) => ({
      workoutName: p.workout.name,
      scheduledDate: p.scheduledDate
        ? new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: tz }).format(p.scheduledDate)
        : 'TBD',
    }));

    const { subject, html } = weeklySummaryTemplate({
      memberName: client.name,
      gymName: org?.name ?? 'Your gym',
      weekLabel,
      workoutsCompleted,
      workoutsMissed,
      totalVolumeKg,
      currentStreak,
      upcomingWorkouts,
      progressUrl: `${this.webUrl}/dashboard/progress`,
    });

    const result = await this.email.send({ to: client.email, subject, html });
    if (result) {
      this.logger.log(`weekly-summary sent to ${client.email} (id=${result.id})`);
      return true;
    }
    return false;
  }
}
