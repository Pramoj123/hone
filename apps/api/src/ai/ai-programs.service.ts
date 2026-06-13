import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { prisma, ProgramStatus, ProgramSource, PlanStatus } from '@hone/database';
import { NimClientService } from './nim-client.service';
import { DailyWorkoutSchema, PlanWorkoutSchema } from './ai.schemas';
import type { GenerateDailyDto } from './dto/generate-daily.dto';
import type { GeneratePlanDto } from './dto/generate-plan.dto';

const DEFAULT_DAILY_LIMIT = 5;

@Injectable()
export class AiProgramsService {
  private readonly logger = new Logger(AiProgramsService.name);

  constructor(private readonly nim: NimClientService) {}

  private get dailyLimit(): number {
    return parseInt(process.env.AI_DAILY_LIMIT ?? String(DEFAULT_DAILY_LIMIT), 10);
  }

  private async checkAndRecordQuota(userId: string, mode: string): Promise<string> {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const usedToday = await prisma.aiGeneration.count({
      where: { userId, createdAt: { gte: startOfDay } },
    });

    if (usedToday >= this.dailyLimit) {
      throw new HttpException(
        `Daily AI generation limit (${this.dailyLimit}) reached. Try again tomorrow.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Insert PENDING row BEFORE the call — attempts always count
    const record = await prisma.aiGeneration.create({
      data: { userId, mode, model: this.nim.model, status: 'PENDING' },
    });
    return record.id;
  }

  private async markGeneration(id: string, mode: string, status: 'SUCCESS' | 'FAILED') {
    await prisma.aiGeneration.update({ where: { id }, data: { mode, status } });
  }

  async getQuota(userId: string) {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const used = await prisma.aiGeneration.count({
      where: { userId, createdAt: { gte: startOfDay } },
    });
    return { used, limit: this.dailyLimit };
  }

  private async buildCatalog(equipment?: string[]): Promise<{ catalogText: string; catalogSet: Set<string> }> {
    // Always include bodyweight + filter by requested equipment
    const equipFilter = equipment?.length
      ? {
          OR: [
            { equipment: { isEmpty: true } },
            { equipment: { hasSome: equipment } },
          ],
        }
      : {};

    const workouts = await prisma.workout.findMany({
      where: { isPublished: true, deletedAt: null, organizationId: null, ...equipFilter },
      select: {
        id: true,
        name: true,
        category: true,
        muscleGroups: true,
        equipment: true,
        difficulty: true,
        durationMinutes: true,
      },
      take: 150,
    });

    const catalogSet = new Set(workouts.map((w) => w.id));
    const catalogText = workouts
      .map(
        (w) =>
          `id:${w.id} name:${w.name} category:${w.category} muscles:${w.muscleGroups.join(',')} ` +
          `equipment:${w.equipment.join(',') || 'none'} difficulty:${w.difficulty} ` +
          `duration:${w.durationMinutes ?? '?'}min`,
      )
      .join('\n');

    return { catalogText, catalogSet };
  }

  private buildProfileBlock(profile: any, user: any): string {
    const age = user.dateOfBirth
      ? Math.floor((Date.now() - new Date(user.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))
      : 'unknown';

    return [
      `Age: ${age}`,
      `Gender: ${user.gender ?? 'unknown'}`,
      `Fitness level: ${profile?.fitnessLevel ?? 'unknown'}`,
      `Primary goal: ${profile?.primaryGoal ?? user.fitnessGoals ?? 'unknown'}`,
      `Height: ${profile?.height ?? 'unknown'}cm`,
      `Weight: ${profile?.weight ?? 'unknown'}kg`,
      `Medical conditions: ${profile?.medicalConditions?.join(', ') || 'none'}`,
      `Past injuries: ${profile?.pastInjuries ?? 'none'}`,
    ].join('\n');
  }

  async generateDaily(userId: string, dto: GenerateDailyDto) {
    const genId = await this.checkAndRecordQuota(userId, 'DAILY');

    try {
      const [user, { catalogText, catalogSet }] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          include: { memberProfile: true },
        }),
        this.buildCatalog(dto.equipment),
      ]);

      const profileBlock = this.buildProfileBlock(user?.memberProfile, user);

      const systemPrompt =
        'You are a certified personal trainer. Pick workoutId values ONLY from the provided catalog. ' +
        'Respond with exactly one JSON object matching the schema — no prose, no markdown fences.';

      const userMessage =
        `Member profile:\n${profileBlock}\n\n` +
        `Request: Generate today\'s workout session.\n` +
        (dto.focus ? `Focus: ${dto.focus}\n` : '') +
        (dto.durationMinutes ? `Target duration: ${dto.durationMinutes} minutes\n` : '') +
        `\nWorkout catalog (one per line):\n${catalogText}\n\n` +
        `Schema: { "workouts": [ { "workoutId": string, "targetSets"?: string, "targetReps"?: string, ` +
        `"targetDurationMinutes"?: number, "targetWeightKg"?: number, "notes"?: string } ] } (1–8 workouts)`;

      const response = await this.nim.completeJson(systemPrompt, userMessage, DailyWorkoutSchema, (parsed) => {
        for (const w of parsed.workouts) {
          if (!catalogSet.has(w.workoutId)) {
            throw new Error(`workoutId ${w.workoutId} not in catalog`);
          }
        }
      });

      // Dedupe — keep the first occurrence of each workout
      const seen = new Set<string>();
      const workouts = response.workouts.filter((w) => {
        if (seen.has(w.workoutId)) return false;
        seen.add(w.workoutId);
        return true;
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const programs = await prisma.$transaction(
        workouts.map((w) =>
          prisma.workoutProgram.create({
            data: {
              clientId: userId,
              trainerId: null,
              workoutId: w.workoutId,
              source: ProgramSource.AI,
              scheduledDate: today,
              targetSets: w.targetSets ?? null,
              targetReps: w.targetReps ?? null,
              targetDurationMinutes: w.targetDurationMinutes ?? null,
              targetWeightKg: w.targetWeightKg ?? null,
              notes: w.notes ?? null,
              status: ProgramStatus.PENDING,
            },
          }),
        ),
      );

      await this.markGeneration(genId, 'DAILY', 'SUCCESS');
      return { programs };
    } catch (err) {
      await this.markGeneration(genId, 'DAILY', 'FAILED').catch(() => null);
      throw err;
    }
  }

  async generatePlan(userId: string, dto: GeneratePlanDto) {
    const genId = await this.checkAndRecordQuota(userId, 'PLAN');

    try {
      const [user, { catalogText, catalogSet }] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          include: { memberProfile: true },
        }),
        this.buildCatalog(dto.equipment),
      ]);

      const profileBlock = this.buildProfileBlock(user?.memberProfile, user);

      const systemPrompt =
        'You are a certified personal trainer. Pick workoutId values ONLY from the provided catalog. ' +
        'Respond with exactly one JSON object matching the schema — no prose, no markdown fences.';

      const userMessage =
        `Member profile:\n${profileBlock}\n\n` +
        `Request: Generate a ${dto.totalWeeks}-week program plan with ${dto.daysPerWeek} training days per week.\n` +
        (dto.goal ? `Goal: ${dto.goal}\n` : '') +
        (dto.durationMinutes ? `Session duration: ${dto.durationMinutes} minutes\n` : '') +
        `\nWorkout catalog (one per line):\n${catalogText}\n\n` +
        `Schema: { "name": string, "description"?: string, "entries": [ { "weekNumber": number (1–${dto.totalWeeks}), ` +
        `"dayOfWeek": "MON"|"TUE"|"WED"|"THU"|"FRI"|"SAT"|"SUN", "workoutId": string, ` +
        `"targetSets"?: number, "targetReps"?: number, "targetDurationMinutes"?: number, ` +
        `"targetWeightKg"?: number, "notes"?: string } ] }`;

      const response = await this.nim.completeJson(systemPrompt, userMessage, PlanWorkoutSchema, (parsed) => {
        for (const e of parsed.entries) {
          if (!catalogSet.has(e.workoutId)) throw new Error(`workoutId ${e.workoutId} not in catalog`);
          if (e.weekNumber > dto.totalWeeks) throw new Error(`weekNumber ${e.weekNumber} exceeds totalWeeks ${dto.totalWeeks}`);
        }
      });

      const startDate = dto.startDate ? new Date(dto.startDate) : new Date();

      const plan = await prisma.$transaction(async (tx) => {
        const created = await tx.programPlan.create({
          data: {
            organizationId: null,
            trainerId: null,
            clientId: userId,
            name: response.name,
            description: response.description ?? null,
            totalWeeks: dto.totalWeeks,
            startDate,
            status: PlanStatus.DRAFT,
            source: ProgramSource.AI,
          },
        });

        await tx.programPlanEntry.createMany({
          data: response.entries.map((e) => ({
            planId: created.id,
            workoutId: e.workoutId,
            weekNumber: e.weekNumber,
            dayOfWeek: e.dayOfWeek as any,
            targetSets: e.targetSets ?? null,
            targetReps: e.targetReps ?? null,
            targetDurationMinutes: e.targetDurationMinutes ?? null,
            targetWeightKg: e.targetWeightKg ?? null,
            notes: e.notes ?? null,
          })),
        });

        return tx.programPlan.findUnique({
          where: { id: created.id },
          include: {
            entries: {
              orderBy: [{ weekNumber: 'asc' }, { dayOfWeek: 'asc' }],
              include: { workout: { select: { id: true, name: true, category: true, difficulty: true, coverImageUrl: true } } },
            },
            _count: { select: { entries: true } },
          },
        });
      });

      await this.markGeneration(genId, 'PLAN', 'SUCCESS');
      return { plan };
    } catch (err) {
      await this.markGeneration(genId, 'PLAN', 'FAILED').catch(() => null);
      throw err;
    }
  }
}
