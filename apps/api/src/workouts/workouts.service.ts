import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { prisma, WorkoutReviewStatus, type Workout } from '@hone/database';
import type { CreateWorkoutDto } from './dto/create-workout.dto';
import { paginate } from '../common/pagination/paginate.helper';
import type { PaginatedResult } from '../common/pagination/paginated-result.type';
import type { PaginationDto } from '../common/pagination/pagination.dto';

@Injectable()
export class WorkoutsService {
  async findAll(
    pagination: PaginationDto,
    category?: string,
    difficulty?: string,
    search?: string,
    reviewStatus?: string,
    globalOnly?: boolean,
  ): Promise<PaginatedResult<Workout>> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (reviewStatus) where.reviewStatus = reviewStatus as WorkoutReviewStatus;
    if (globalOnly) where.organizationId = null;

    return paginate<Workout>(
      prisma.workout as Parameters<typeof paginate<Workout>>[0],
      {
        where,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        include: { organization: { select: { id: true, name: true, slug: true } } },
      },
      pagination,
    );
  }

  async findOne(id: string): Promise<Workout> {
    const workout = await prisma.workout.findFirst({
      where: { id, deletedAt: null },
      include: { organization: { select: { id: true, name: true, slug: true } } },
    });
    if (!workout) throw new NotFoundException('Workout not found');
    return workout;
  }

  async create(dto: CreateWorkoutDto): Promise<Workout> {
    const existing = await prisma.workout.findFirst({
      where: { slug: dto.slug, organizationId: null },
    });
    if (existing) throw new ConflictException('Slug already in use');

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
        // Global workout — no org, auto-approved
        organizationId: null,
        reviewStatus: WorkoutReviewStatus.APPROVED,
      },
    });
  }

  async update(id: string, dto: Partial<CreateWorkoutDto>): Promise<Workout> {
    await this.findOne(id);

    if (dto.slug) {
      const conflict = await prisma.workout.findFirst({
        where: { slug: dto.slug, organizationId: null, NOT: { id } },
      });
      if (conflict) throw new ConflictException('Slug already in use');
    }

    return prisma.workout.update({
      where: { id },
      data: dto as Partial<Workout>,
    });
  }

  async remove(id: string): Promise<{ ok: boolean }> {
    await this.findOne(id);
    await prisma.workout.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }

  // ── Review actions (SUPER_ADMIN only) ───────────────────────────────

  async approve(id: string): Promise<Workout> {
    const workout = await prisma.workout.findFirst({
      where: { id, deletedAt: null, reviewStatus: WorkoutReviewStatus.PENDING_REVIEW },
    });
    if (!workout) throw new NotFoundException('Workout not found or not pending review');

    return prisma.workout.update({
      where: { id },
      data: { reviewStatus: WorkoutReviewStatus.APPROVED, reviewNotes: null },
      include: { organization: { select: { id: true, name: true, slug: true } } },
    });
  }

  async reject(id: string, notes: string): Promise<Workout> {
    const workout = await prisma.workout.findFirst({
      where: { id, deletedAt: null, reviewStatus: WorkoutReviewStatus.PENDING_REVIEW },
    });
    if (!workout) throw new NotFoundException('Workout not found or not pending review');

    if (!notes?.trim()) throw new ForbiddenException('Rejection notes are required');

    return prisma.workout.update({
      where: { id },
      data: { reviewStatus: WorkoutReviewStatus.REJECTED, reviewNotes: notes },
      include: { organization: { select: { id: true, name: true, slug: true } } },
    });
  }
}
