import { Injectable, Logger } from '@nestjs/common';
import { prisma, ProgramStatus, RecurrenceDay } from '@hone/database';

// Maps our RecurrenceDay enum values to JS getDay() numbers (0=Sun … 6=Sat)
const RECURRENCE_DAY_JS: Record<string, number> = {
  MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 0,
};

export interface GenerationResult {
  created: number;
  skipped: number;
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  /**
   * Find all recurring WorkoutProgram records that were recently scheduled
   * (within the last 7 days), deduplicate by (clientId, workoutId, trainerId),
   * then generate next-week entries for each qualifying group.
   */
  async generateNextWeekPrograms(): Promise<GenerationResult> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // ── 1. Fetch all recurring programs scheduled in the last 7 days ─────────
    const recentPrograms = await prisma.workoutProgram.findMany({
      where: {
        isRecurring: true,
        deletedAt: null,
        status: { in: [ProgramStatus.ACTIVE, ProgramStatus.PENDING] },
        scheduledDate: { gte: sevenDaysAgo },
      },
      select: {
        id: true,
        clientId: true,
        trainerId: true,
        workoutId: true,
        recurrenceDays: true,
        targetSets: true,
        targetReps: true,
        targetWeightKg: true,
        targetDurationMinutes: true,
        scheduledDate: true,
      },
      orderBy: { scheduledDate: 'desc' },
    });

    if (recentPrograms.length === 0) {
      this.logger.log('No qualifying recurring programs found');
      return { created: 0, skipped: 0 };
    }

    // ── 2. Deduplicate by (clientId, workoutId, trainerId) — keep most recent ─
    const groupMap = new Map<string, typeof recentPrograms[number]>();
    for (const program of recentPrograms) {
      const key = `${program.clientId}::${program.workoutId}::${program.trainerId}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, program); // already ordered desc, first = most recent
      }
    }

    const groups = [...groupMap.values()];
    this.logger.log(`Processing ${groups.length} unique recurring program group(s)`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ── 3. Calculate next-week dates for each qualifying group ───────────────
    const candidateRecords: Array<{
      clientId: string;
      trainerId: string | null;
      workoutId: string;
      scheduledDate: Date;
      targetSets: string | null;
      targetReps: string | null;
      targetWeightKg: number | null;
      targetDurationMinutes: number | null;
      isRecurring: boolean;
      recurrenceDays: RecurrenceDay[];
      status: ProgramStatus;
    }> = [];

    for (const group of groups) {
      if (group.recurrenceDays.length === 0) continue;

      for (const day of group.recurrenceDays) {
        const scheduledDate = this.nextOccurrence(today, day);
        candidateRecords.push({
          clientId: group.clientId,
          trainerId: group.trainerId,
          workoutId: group.workoutId,
          scheduledDate,
          targetSets: group.targetSets,
          targetReps: group.targetReps,
          targetWeightKg: group.targetWeightKg,
          targetDurationMinutes: group.targetDurationMinutes,
          isRecurring: true,
          recurrenceDays: group.recurrenceDays as RecurrenceDay[],
          status: ProgramStatus.PENDING,
        });
      }
    }

    if (candidateRecords.length === 0) {
      return { created: 0, skipped: 0 };
    }

    // ── 4. Idempotency check — exclude dates that already exist ──────────────
    const existingKeys = new Set<string>();
    const existingPrograms = await prisma.workoutProgram.findMany({
      where: {
        deletedAt: null,
        OR: candidateRecords.map((record) => ({
          clientId: record.clientId,
          workoutId: record.workoutId,
          scheduledDate: record.scheduledDate,
        })),
      },
      select: { clientId: true, workoutId: true, scheduledDate: true },
    });
    for (const existing of existingPrograms) {
      existingKeys.add(
        `${existing.clientId}::${existing.workoutId}::${existing.scheduledDate?.toISOString()}`,
      );
    }

    const toCreate = candidateRecords.filter((record) => {
      const key = `${record.clientId}::${record.workoutId}::${record.scheduledDate.toISOString()}`;
      return !existingKeys.has(key);
    });
    const skipped = candidateRecords.length - toCreate.length;

    // ── 5. Bulk insert ────────────────────────────────────────────────────────
    if (toCreate.length === 0) {
      this.logger.log(`All ${skipped} candidate(s) already exist — nothing to create`);
      return { created: 0, skipped };
    }

    const { count } = await prisma.workoutProgram.createMany({ data: toCreate });

    this.logger.log(`Recurring scheduler: created=${count}, skipped=${skipped}`);
    return { created: count, skipped };
  }

  /**
   * Returns the next occurrence of a given weekday strictly after `from`.
   * If `from` is already that weekday, it returns the NEXT week's occurrence.
   */
  private nextOccurrence(from: Date, day: string): Date {
    const targetDow = RECURRENCE_DAY_JS[day] ?? 1;
    const currentDow = from.getDay();
    let daysUntil = targetDow - currentDow;
    if (daysUntil <= 0) daysUntil += 7;

    const next = new Date(from);
    next.setDate(next.getDate() + daysUntil);
    next.setHours(0, 0, 0, 0);
    return next;
  }
}
