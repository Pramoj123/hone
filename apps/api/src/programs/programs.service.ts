import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { prisma, Role, ProgramStatus } from '@hone/database';
import { NotificationsService } from '../notifications/notifications.service';
import type { CreateProgramDto } from './dto/create-program.dto';
import type { ListProgramsDto } from './dto/list-programs.dto';
import type { CurrentUserType } from '../common/decorators/current-user.decorator';

const PROGRAM_INCLUDE = {
  workout: {
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      difficulty: true,
      coverImageUrl: true,
      muscleGroups: true,
      equipment: true,
      description: true,
      instructions: true,
      tips: true,
      videoUrl: true,
      sets: true,
      reps: true,
      restSeconds: true,
      durationMinutes: true,
    },
  },
  client: {
    select: { id: true, name: true, email: true, photoUrl: true, branchId: true },
  },
  trainer: {
    select: { id: true, name: true, email: true, photoUrl: true },
  },
  _count: { select: { logs: true } },
};

@Injectable()
export class ProgramsService {
  private readonly logger = new Logger(ProgramsService.name);

  constructor(private readonly notifications: NotificationsService) {}

  private branchFilter(user: CurrentUserType) {
    if (
      (user.role === Role.TRAINER || user.role === Role.BRANCH_MANAGER) &&
      user.branchId
    ) {
      return { branchId: user.branchId };
    }
    return {};
  }

  async findAll(organizationId: string, user: CurrentUserType, query: ListProgramsDto): Promise<unknown> {
    const { clientId, status, page = 1, limit = 20 } = query;
    const resolvedTrainerId =
      query.trainerId === 'me' ? user.id : query.trainerId;

    const where = {
      deletedAt: null,
      ...(clientId ? { clientId } : {}),
      ...(resolvedTrainerId ? { trainerId: resolvedTrainerId } : {}),
      ...(status ? { status: status as ProgramStatus } : {}),
      client: {
        branch: { organizationId },
        deletedAt: null,
        ...this.branchFilter(user),
      },
    };

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.workoutProgram.findMany({
        where,
        include: PROGRAM_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.workoutProgram.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, organizationId: string, user: CurrentUserType): Promise<unknown> {
    const program = await prisma.workoutProgram.findFirst({
      where: {
        id,
        deletedAt: null,
        client: { branch: { organizationId }, deletedAt: null },
      },
      include: { ...PROGRAM_INCLUDE, logs: { orderBy: { completedAt: 'desc' }, take: 10 } },
    });
    if (!program) throw new NotFoundException('Program not found');

    if (
      (user.role === Role.TRAINER || user.role === Role.BRANCH_MANAGER) &&
      user.branchId &&
      program.client.branchId !== user.branchId
    ) {
      throw new ForbiddenException('Access restricted to your branch');
    }

    return program;
  }

  async create(organizationId: string, user: CurrentUserType, dto: CreateProgramDto): Promise<unknown> {
    const trainerId = dto.trainerId ?? user.id;

    // Validate workout exists and is published
    const workout = await prisma.workout.findFirst({
      where: { id: dto.workoutId, isPublished: true, deletedAt: null },
    });
    if (!workout) throw new BadRequestException('Workout not found');

    // Validate client belongs to the org
    const client = await prisma.user.findFirst({
      where: {
        id: dto.clientId,
        role: Role.CLIENT,
        branch: { organizationId },
        deletedAt: null,
      },
      select: { id: true, branchId: true },
    });
    if (!client) throw new BadRequestException('Client not found in this organization');

    // Validate trainer belongs to the org
    const trainer = await prisma.user.findFirst({
      where: {
        id: trainerId,
        branch: { organizationId },
        deletedAt: null,
      },
      select: { id: true, branchId: true },
    });
    if (!trainer) throw new BadRequestException('Trainer not found in this organization');

    // TRAINER can only assign to clients in their own branch
    if (user.role === Role.TRAINER && user.branchId) {
      if (client.branchId !== user.branchId) {
        throw new ForbiddenException('You can only assign programs to clients in your branch');
      }
      if (trainerId !== user.id) {
        throw new ForbiddenException('Trainers can only assign programs as themselves');
      }
    }

    // BRANCH_MANAGER can only assign within their branch
    if (user.role === Role.BRANCH_MANAGER && user.branchId) {
      if (client.branchId !== user.branchId) {
        throw new ForbiddenException('You can only assign programs to clients in your branch');
      }
    }

    const program = await prisma.workoutProgram.create({
      data: {
        clientId: dto.clientId,
        trainerId,
        workoutId: dto.workoutId,
        targetSets: dto.targetSets,
        targetReps: dto.targetReps,
        targetDurationMinutes: dto.targetDurationMinutes,
        targetWeightKg: dto.targetWeightKg,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
        isRecurring: dto.isRecurring ?? false,
        recurrenceDays: (dto.recurrenceDays as any) ?? [],
        status: (dto.status as ProgramStatus) ?? ProgramStatus.PENDING,
        notes: dto.notes,
      },
      include: PROGRAM_INCLUDE,
    });

    this.notifications.onProgramAssigned(program.id)
      .catch((err) => this.logger.error('onProgramAssigned failed', err));

    return program;
  }

  async update(
    id: string,
    organizationId: string,
    user: CurrentUserType,
    dto: Partial<CreateProgramDto>,
  ): Promise<unknown> {
    const program = await this.findOne(id, organizationId, user) as any;

    // TRAINERs can only modify programs they created
    if (user.role === Role.TRAINER && program.trainerId !== user.id) {
      throw new ForbiddenException('You can only modify programs you created');
    }

    const data: Record<string, unknown> = {};
    if (dto.targetSets !== undefined) data.targetSets = dto.targetSets;
    if (dto.targetReps !== undefined) data.targetReps = dto.targetReps;
    if (dto.targetDurationMinutes !== undefined) data.targetDurationMinutes = dto.targetDurationMinutes;
    if (dto.targetWeightKg !== undefined) data.targetWeightKg = dto.targetWeightKg;
    if (dto.scheduledDate !== undefined) data.scheduledDate = dto.scheduledDate ? new Date(dto.scheduledDate) : null;
    if (dto.isRecurring !== undefined) data.isRecurring = dto.isRecurring;
    if (dto.recurrenceDays !== undefined) data.recurrenceDays = dto.recurrenceDays;
    if (dto.status !== undefined) data.status = dto.status as ProgramStatus;
    if (dto.notes !== undefined) data.notes = dto.notes;

    return prisma.workoutProgram.update({
      where: { id },
      data,
      include: PROGRAM_INCLUDE,
    });
  }

  async remove(id: string, organizationId: string, user: CurrentUserType): Promise<unknown> {
    const program = await this.findOne(id, organizationId, user) as any;

    if (user.role === Role.TRAINER && program.trainerId !== user.id) {
      throw new ForbiddenException('You can only delete programs you created');
    }

    await prisma.workoutProgram.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }

  // ── Client-facing (me) ───────────────────────────────────────────────

  async findForClient(clientId: string, query: ListProgramsDto): Promise<unknown> {
    const { status, page = 1, limit = 20 } = query;

    const where = {
      clientId,
      deletedAt: null,
      ...(status ? { status: status as ProgramStatus } : {}),
    };

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.workoutProgram.findMany({
        where,
        include: PROGRAM_INCLUDE,
        orderBy: [{ status: 'asc' }, { scheduledDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.workoutProgram.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOneForClient(id: string, clientId: string): Promise<unknown> {
    const program = await prisma.workoutProgram.findFirst({
      where: { id, clientId, deletedAt: null },
      include: {
        ...PROGRAM_INCLUDE,
        logs: { orderBy: { completedAt: 'desc' } },
      },
    });
    if (!program) throw new NotFoundException('Program not found');
    return program;
  }
}
