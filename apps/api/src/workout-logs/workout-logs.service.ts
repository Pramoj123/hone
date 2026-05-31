import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { prisma, Role, ProgramStatus } from '@hone/database';
import type { CreateWorkoutLogDto } from './dto/create-workout-log.dto';
import type { PaginationDto } from '../common/pagination/pagination.dto';
import type { CurrentUserType } from '../common/decorators/current-user.decorator';

const LOG_INCLUDE = {
  program: {
    select: {
      id: true,
      workout: { select: { id: true, name: true, category: true, difficulty: true } },
    },
  },
};

@Injectable()
export class WorkoutLogsService {
  async createLog(
    programId: string,
    clientId: string,
    dto: CreateWorkoutLogDto,
  ) {
    // Verify the program belongs to this client
    const program = await prisma.workoutProgram.findFirst({
      where: { id: programId, clientId, deletedAt: null },
    });
    if (!program) throw new NotFoundException('Program not found');

    const log = await prisma.$transaction(async (tx) => {
      const newLog = await tx.workoutLog.create({
        data: {
          programId,
          clientId,
          actualSets: dto.actualSets,
          actualReps: dto.actualReps,
          actualWeightKg: dto.actualWeightKg,
          actualDurationMinutes: dto.actualDurationMinutes,
          rpe: dto.rpe,
          completedAt: dto.completedAt ? new Date(dto.completedAt) : new Date(),
          notes: dto.notes,
        },
        include: LOG_INCLUDE,
      });

      // Auto-complete one-off programs on first log
      if (!program.isRecurring && program.status !== ProgramStatus.COMPLETED) {
        await tx.workoutProgram.update({
          where: { id: programId },
          data: { status: ProgramStatus.COMPLETED },
        });
      }

      return newLog;
    });

    return log;
  }

  async findLogsForClient(clientId: string, pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const where = { clientId };

    const [data, total] = await Promise.all([
      prisma.workoutLog.findMany({
        where,
        include: LOG_INCLUDE,
        orderBy: { completedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.workoutLog.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOneForClient(id: string, clientId: string) {
    const log = await prisma.workoutLog.findFirst({
      where: { id, clientId },
      include: LOG_INCLUDE,
    });
    if (!log) throw new NotFoundException('Log not found');
    return log;
  }

  async updateLog(id: string, clientId: string, dto: Partial<CreateWorkoutLogDto>) {
    const log = await this.findOneForClient(id, clientId);

    const ageMs = Date.now() - log.createdAt.getTime();
    if (ageMs > 24 * 60 * 60 * 1000) {
      throw new ForbiddenException('Logs can only be edited within 24 hours of creation');
    }

    const data: Record<string, unknown> = {};
    if (dto.actualSets !== undefined) data.actualSets = dto.actualSets;
    if (dto.actualReps !== undefined) data.actualReps = dto.actualReps;
    if (dto.actualWeightKg !== undefined) data.actualWeightKg = dto.actualWeightKg;
    if (dto.actualDurationMinutes !== undefined) data.actualDurationMinutes = dto.actualDurationMinutes;
    if (dto.rpe !== undefined) data.rpe = dto.rpe;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.completedAt !== undefined) data.completedAt = dto.completedAt ? new Date(dto.completedAt) : undefined;

    return prisma.workoutLog.update({ where: { id }, data, include: LOG_INCLUDE });
  }

  // ── Staff view ───────────────────────────────────────────────────────

  async findLogsForMember(
    memberId: string,
    organizationId: string,
    user: CurrentUserType,
    pagination: PaginationDto,
  ) {
    // Verify member belongs to the org and caller's branch if scoped
    const member = await prisma.user.findFirst({
      where: {
        id: memberId,
        role: Role.CLIENT,
        branch: { organizationId },
        deletedAt: null,
        ...(
          (user.role === Role.TRAINER || user.role === Role.BRANCH_MANAGER) && user.branchId
            ? { branchId: user.branchId }
            : {}
        ),
      },
      select: { id: true },
    });
    if (!member) throw new NotFoundException('Member not found');

    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;
    const where = { clientId: memberId };

    const [data, total] = await Promise.all([
      prisma.workoutLog.findMany({
        where,
        include: LOG_INCLUDE,
        orderBy: { completedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.workoutLog.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
