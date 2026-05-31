import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { prisma, Role, WorkoutReviewStatus } from '@hone/database';
import type { CreateWorkoutDto } from '../workouts/dto/create-workout.dto';
import type { CurrentUserType } from '../common/decorators/current-user.decorator';
import type { PaginationDto } from '../common/pagination/pagination.dto';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto as PD } from '../common/pagination/pagination.dto';

export class ListGymWorkoutsDto extends PD {
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() difficulty?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() reviewStatus?: string;
  // When true, also include global + approved workouts (for assignment picker)
  @IsOptional() @IsString() scope?: 'own' | 'all';
}

const ORG_WORKOUT_INCLUDE = {
  organization: { select: { id: true, name: true, slug: true } },
  createdBy: { select: { id: true, name: true, role: true } },
};

@Injectable()
export class GymWorkoutsService {
  async findAll(organizationId: string, user: CurrentUserType, query: ListGymWorkoutsDto) {
    const { category, difficulty, search, reviewStatus, scope, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const scopeFilter =
      scope === 'all'
        ? {
            OR: [
              { organizationId: null as string | null, reviewStatus: WorkoutReviewStatus.APPROVED },
              { organizationId },
            ],
          }
        : { organizationId };

    const where = {
      deletedAt: null,
      ...(category ? { category } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
      ...(reviewStatus ? { reviewStatus: reviewStatus as WorkoutReviewStatus } : {}),
      ...scopeFilter,
    };

    const [data, total] = await Promise.all([
      prisma.workout.findMany({
        where,
        include: ORG_WORKOUT_INCLUDE,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.workout.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, organizationId: string) {
    const workout = await prisma.workout.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { organizationId: null, reviewStatus: WorkoutReviewStatus.APPROVED },
          { organizationId },
        ],
      },
      include: ORG_WORKOUT_INCLUDE,
    });
    if (!workout) throw new NotFoundException('Workout not found');
    return workout;
  }

  async create(organizationId: string, user: CurrentUserType, dto: CreateWorkoutDto) {
    // Slug must be unique within the org
    const existing = await prisma.workout.findFirst({
      where: { slug: dto.slug, organizationId },
    });
    if (existing) throw new ConflictException('Slug already in use in your gym');

    return prisma.workout.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        category: dto.category,
        difficulty: dto.difficulty,
        muscleGroups: dto.muscleGroups ?? [],
        equipment: dto.equipment ?? [],
        coverImageUrl: dto.coverImageUrl,
        imageUrls: dto.imageUrls ?? [],
        videoUrl: dto.videoUrl,
        audioUrl: dto.audioUrl,
        description: dto.description,
        instructions: dto.instructions,
        tips: dto.tips,
        sets: dto.sets,
        reps: dto.reps,
        restSeconds: dto.restSeconds,
        durationMinutes: dto.durationMinutes,
        caloriesPerHour: dto.caloriesPerHour,
        isPublished: dto.isPublished ?? true,
        organizationId,
        createdById: user.id,
        reviewStatus: WorkoutReviewStatus.DRAFT,
      },
      include: ORG_WORKOUT_INCLUDE,
    });
  }

  async update(
    id: string,
    organizationId: string,
    user: CurrentUserType,
    dto: Partial<CreateWorkoutDto>,
  ) {
    const workout = await prisma.workout.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!workout) throw new NotFoundException('Workout not found');

    // TRAINERs can only edit workouts they created
    if (user.role === Role.TRAINER && workout.createdById !== user.id) {
      throw new ForbiddenException('You can only edit workouts you created');
    }

    // Can't edit after it's been submitted for review (until rejected)
    if (workout.reviewStatus === WorkoutReviewStatus.PENDING_REVIEW) {
      throw new ForbiddenException('Cannot edit a workout that is pending review');
    }

    if (dto.slug && dto.slug !== workout.slug) {
      const conflict = await prisma.workout.findFirst({
        where: { slug: dto.slug, organizationId, NOT: { id } },
      });
      if (conflict) throw new ConflictException('Slug already in use in your gym');
    }

    return prisma.workout.update({
      where: { id },
      data: dto as object,
      include: ORG_WORKOUT_INCLUDE,
    });
  }

  async remove(id: string, organizationId: string, user: CurrentUserType) {
    const workout = await prisma.workout.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!workout) throw new NotFoundException('Workout not found');

    if (user.role === Role.TRAINER && workout.createdById !== user.id) {
      throw new ForbiddenException('You can only delete workouts you created');
    }

    await prisma.workout.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }

  async submitForReview(id: string, organizationId: string, user: CurrentUserType) {
    const workout = await prisma.workout.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!workout) throw new NotFoundException('Workout not found');

    if (user.role === Role.TRAINER && workout.createdById !== user.id) {
      throw new ForbiddenException('You can only submit workouts you created');
    }

    if (workout.reviewStatus === WorkoutReviewStatus.PENDING_REVIEW) {
      throw new ConflictException('Workout is already pending review');
    }
    if (workout.reviewStatus === WorkoutReviewStatus.APPROVED) {
      throw new ConflictException('Workout is already approved');
    }

    return prisma.workout.update({
      where: { id },
      data: { reviewStatus: WorkoutReviewStatus.PENDING_REVIEW, reviewNotes: null },
      include: ORG_WORKOUT_INCLUDE,
    });
  }
}
