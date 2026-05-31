import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { prisma, type Workout } from '@hone/database';
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
  ): Promise<PaginatedResult<Workout>> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    return paginate<Workout>(
      prisma.workout as Parameters<typeof paginate<Workout>>[0],
      { where, orderBy: [{ category: 'asc' }, { name: 'asc' }] },
      pagination,
    );
  }

  async findOne(id: string): Promise<Workout> {
    const workout = await prisma.workout.findFirst({
      where: { id, deletedAt: null },
    });
    if (!workout) throw new NotFoundException('Workout not found');
    return workout;
  }

  async create(dto: CreateWorkoutDto): Promise<Workout> {
    const existing = await prisma.workout.findUnique({
      where: { slug: dto.slug },
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
      },
    });
  }

  async update(id: string, dto: Partial<CreateWorkoutDto>): Promise<Workout> {
    await this.findOne(id);

    if (dto.slug) {
      const conflict = await prisma.workout.findFirst({
        where: { slug: dto.slug, NOT: { id } },
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
}
