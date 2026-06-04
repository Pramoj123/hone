import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { prisma, Role, PlanStatus, ProgramStatus } from '@hone/database';
import type { CreatePlanDto } from './dto/create-plan.dto';
import type { ListPlansDto } from './dto/list-plans.dto';
import type { UpdateEntriesDto } from './dto/update-entries.dto';
import type { CurrentUserType } from '../common/decorators/current-user.decorator';

const DAY_OFFSET: Record<string, number> = {
  MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4, SAT: 5, SUN: 6,
};

const ENTRY_WORKOUT_SELECT = {
  id: true,
  name: true,
  slug: true,
  category: true,
  difficulty: true,
  muscleGroups: true,
  durationMinutes: true,
  coverImageUrl: true,
};

const PLAN_INCLUDE_SUMMARY = {
  client: { select: { id: true, name: true, email: true, photoUrl: true, memberNumber: true } },
  trainer: { select: { id: true, name: true, email: true } },
  _count: { select: { entries: true } },
};

const PLAN_INCLUDE_FULL = {
  client: { select: { id: true, name: true, email: true, photoUrl: true, memberNumber: true } },
  trainer: { select: { id: true, name: true, email: true } },
  entries: {
    orderBy: [{ weekNumber: 'asc' as const }, { dayOfWeek: 'asc' as const }],
    include: { workout: { select: ENTRY_WORKOUT_SELECT } },
  },
};

@Injectable()
export class ProgramPlansService {
  private async resolveOrgId(user: CurrentUserType): Promise<string> {
    if (user.organizationId) return user.organizationId;
    if (user.branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: user.branchId },
        select: { organizationId: true },
      });
      if (branch) return branch.organizationId;
    }
    throw new ForbiddenException();
  }

  private async findPlanOrThrow(id: string, organizationId: string) {
    const plan = await prisma.programPlan.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: PLAN_INCLUDE_FULL,
    });
    if (!plan) throw new NotFoundException('Program plan not found');
    return plan;
  }

  async create(organizationId: string, user: CurrentUserType, dto: CreatePlanDto) {
    const client = await prisma.user.findFirst({
      where: { id: dto.clientId, branch: { organizationId }, deletedAt: null },
      select: { id: true },
    });
    if (!client) throw new BadRequestException('Client not found in this organization');

    return prisma.programPlan.create({
      data: {
        organizationId,
        trainerId: user.id,
        clientId: dto.clientId,
        name: dto.name,
        description: dto.description,
        totalWeeks: dto.totalWeeks,
        startDate: new Date(dto.startDate),
        status: PlanStatus.DRAFT,
      },
      include: PLAN_INCLUDE_FULL,
    });
  }

  async findAll(organizationId: string, user: CurrentUserType, query: ListPlansDto) {
    const { clientId, status, page = 1, limit = 20 } = query;
    const resolvedTrainerId = query.trainerId === 'me' ? user.id : query.trainerId;

    const branchFilter =
      user.role === Role.TRAINER && user.branchId ? { client: { branchId: user.branchId } } : {};

    const where = {
      organizationId,
      deletedAt: null,
      ...(clientId ? { clientId } : {}),
      ...(resolvedTrainerId ? { trainerId: resolvedTrainerId } : {}),
      ...(status ? { status: status as PlanStatus } : {}),
      ...branchFilter,
    };

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.programPlan.findMany({
        where,
        include: PLAN_INCLUDE_SUMMARY,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.programPlan.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, organizationId: string) {
    return this.findPlanOrThrow(id, organizationId);
  }

  async updateEntries(id: string, organizationId: string, user: CurrentUserType, dto: UpdateEntriesDto) {
    const plan = await this.findPlanOrThrow(id, organizationId);

    if (plan.status === PlanStatus.ACTIVE || plan.status === PlanStatus.COMPLETED) {
      throw new BadRequestException('Cannot edit entries of an active or completed plan');
    }
    if (user.role === Role.TRAINER && (plan as any).trainerId !== user.id) {
      throw new ForbiddenException('You can only edit plans you created');
    }

    // Validate all workout IDs exist
    const workoutIds = [...new Set(dto.entries.map((e) => e.workoutId))];
    const workouts = await prisma.workout.findMany({
      where: { id: { in: workoutIds }, deletedAt: null },
      select: { id: true },
    });
    if (workouts.length !== workoutIds.length) {
      throw new BadRequestException('One or more workouts not found');
    }

    // Replace all entries in a transaction
    await prisma.$transaction([
      prisma.programPlanEntry.deleteMany({ where: { planId: id } }),
      prisma.programPlanEntry.createMany({
        data: dto.entries.map((e) => ({
          planId: id,
          workoutId: e.workoutId,
          weekNumber: e.weekNumber,
          dayOfWeek: e.dayOfWeek as any,
          notes: e.notes,
          targetSets: e.targetSets,
          targetReps: e.targetReps,
          targetWeightKg: e.targetWeightKg,
          targetDurationMinutes: e.targetDurationMinutes,
        })),
      }),
    ]);

    return this.findPlanOrThrow(id, organizationId);
  }

  async activate(id: string, organizationId: string, user: CurrentUserType) {
    const plan = await this.findPlanOrThrow(id, organizationId);

    if (plan.status !== PlanStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT plans can be activated');
    }
    if ((plan as any).entries.length === 0) {
      throw new BadRequestException('Plan must have at least one entry before activation');
    }
    if (user.role === Role.TRAINER && (plan as any).trainerId !== user.id) {
      throw new ForbiddenException('You can only activate plans you created');
    }

    const startDate = new Date((plan as any).startDate);

    const programs = await prisma.$transaction(async (tx) => {
      const created = await tx.workoutProgram.createMany({
        data: (plan as any).entries.map((entry: any) => {
          const scheduled = new Date(startDate);
          scheduled.setDate(
            scheduled.getDate() + (entry.weekNumber - 1) * 7 + DAY_OFFSET[entry.dayOfWeek],
          );
          return {
            clientId: (plan as any).clientId,
            trainerId: (plan as any).trainerId,
            workoutId: entry.workoutId,
            scheduledDate: scheduled,
            targetSets: entry.targetSets != null ? String(entry.targetSets) : null,
            targetReps: entry.targetReps != null ? String(entry.targetReps) : null,
            targetWeightKg: entry.targetWeightKg,
            targetDurationMinutes: entry.targetDurationMinutes,
            notes: entry.notes,
            status: ProgramStatus.PENDING,
          };
        }),
      });

      await tx.programPlan.update({
        where: { id },
        data: { status: PlanStatus.ACTIVE },
      });

      return created;
    });

    const updatedPlan = await prisma.programPlan.findUnique({
      where: { id },
      include: PLAN_INCLUDE_SUMMARY,
    });

    return { plan: updatedPlan, programsCreated: programs.count };
  }

  async remove(id: string, organizationId: string, user: CurrentUserType) {
    const plan = await this.findPlanOrThrow(id, organizationId);

    if ((plan as any).status !== PlanStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT plans can be deleted');
    }
    if (
      user.role !== Role.ORG_ADMIN &&
      user.role !== Role.SUPER_ADMIN &&
      (plan as any).trainerId !== user.id
    ) {
      throw new ForbiddenException('Access denied');
    }

    await prisma.programPlan.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }

  // ── Client-facing (me) ───────────────────────────────────────────────────────

  async findForClient(clientId: string) {
    return prisma.programPlan.findMany({
      where: {
        clientId,
        deletedAt: null,
        status: { not: PlanStatus.CANCELLED },
      },
      include: {
        trainer: { select: { id: true, name: true, email: true } },
        _count: { select: { entries: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForClient(id: string, clientId: string) {
    const plan = await prisma.programPlan.findFirst({
      where: { id, clientId, deletedAt: null },
      include: PLAN_INCLUDE_FULL,
    });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }
}
