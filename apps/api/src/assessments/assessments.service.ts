import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { prisma, Role } from '@hone/database';
import type { CreateAssessmentDto } from './dto/create-assessment.dto';
import type { PaginationDto } from '../common/pagination/pagination.dto';
import type { CurrentUserType } from '../common/decorators/current-user.decorator';

const ASSESSMENT_INCLUDE = {
  client: { select: { id: true, name: true, email: true, photoUrl: true } },
  trainer: { select: { id: true, name: true, email: true } },
};

@Injectable()
export class AssessmentsService {
  private async verifyMemberAccess(
    memberId: string,
    organizationId: string,
    user: CurrentUserType,
  ) {
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
    return member;
  }

  async upsert(
    memberId: string,
    organizationId: string,
    user: CurrentUserType,
    dto: CreateAssessmentDto,
  ) {
    await this.verifyMemberAccess(memberId, organizationId, user);

    const data = {
      weightKg: dto.weightKg,
      bodyFatPct: dto.bodyFatPct,
      waistCm: dto.waistCm,
      chestCm: dto.chestCm,
      hipsCm: dto.hipsCm,
      performanceNotes: dto.performanceNotes,
      goalsNextWeek: dto.goalsNextWeek,
      overallRating: dto.overallRating,
      trainerId: user.id,
    };

    return prisma.weeklyAssessment.upsert({
      where: {
        clientId_weekNumber_year: {
          clientId: memberId,
          weekNumber: dto.weekNumber,
          year: dto.year,
        },
      },
      update: data,
      create: { clientId: memberId, weekNumber: dto.weekNumber, year: dto.year, ...data },
      include: ASSESSMENT_INCLUDE,
    });
  }

  async findAllForMember(
    memberId: string,
    organizationId: string,
    user: CurrentUserType,
    pagination: PaginationDto,
  ) {
    await this.verifyMemberAccess(memberId, organizationId, user);

    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;
    const where = { clientId: memberId };

    const [data, total] = await Promise.all([
      prisma.weeklyAssessment.findMany({
        where,
        include: ASSESSMENT_INCLUDE,
        orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.weeklyAssessment.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findAll(organizationId: string, user: CurrentUserType, pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const branchFilter =
      (user.role === Role.TRAINER || user.role === Role.BRANCH_MANAGER) && user.branchId
        ? { branchId: user.branchId }
        : {};

    const where = {
      client: { branch: { organizationId }, deletedAt: null, ...branchFilter },
    };

    const [data, total] = await Promise.all([
      prisma.weeklyAssessment.findMany({
        where,
        include: ASSESSMENT_INCLUDE,
        orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.weeklyAssessment.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, organizationId: string, user: CurrentUserType) {
    const assessment = await prisma.weeklyAssessment.findFirst({
      where: {
        id,
        client: { branch: { organizationId }, deletedAt: null },
      },
      include: ASSESSMENT_INCLUDE,
    });
    if (!assessment) throw new NotFoundException('Assessment not found');

    if (
      (user.role === Role.TRAINER || user.role === Role.BRANCH_MANAGER) &&
      user.branchId
    ) {
      const member = await prisma.user.findFirst({
        where: { id: assessment.clientId, branchId: user.branchId },
        select: { id: true },
      });
      if (!member) throw new ForbiddenException('Access restricted to your branch');
    }

    return assessment;
  }

  async update(
    id: string,
    organizationId: string,
    user: CurrentUserType,
    dto: Partial<CreateAssessmentDto>,
  ) {
    const assessment = await this.findOne(id, organizationId, user);

    if (user.role === Role.TRAINER && assessment.trainerId !== user.id) {
      throw new ForbiddenException('You can only edit assessments you created');
    }

    const data: Record<string, unknown> = {};
    if (dto.weightKg !== undefined) data.weightKg = dto.weightKg;
    if (dto.bodyFatPct !== undefined) data.bodyFatPct = dto.bodyFatPct;
    if (dto.waistCm !== undefined) data.waistCm = dto.waistCm;
    if (dto.chestCm !== undefined) data.chestCm = dto.chestCm;
    if (dto.hipsCm !== undefined) data.hipsCm = dto.hipsCm;
    if (dto.performanceNotes !== undefined) data.performanceNotes = dto.performanceNotes;
    if (dto.goalsNextWeek !== undefined) data.goalsNextWeek = dto.goalsNextWeek;
    if (dto.overallRating !== undefined) data.overallRating = dto.overallRating;

    return prisma.weeklyAssessment.update({
      where: { id },
      data,
      include: ASSESSMENT_INCLUDE,
    });
  }

  // ── Client-facing ────────────────────────────────────────────────────

  async findAllForClient(clientId: string, pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;
    const where = { clientId };

    const [data, total] = await Promise.all([
      prisma.weeklyAssessment.findMany({
        where,
        include: ASSESSMENT_INCLUDE,
        orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.weeklyAssessment.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOneForClient(id: string, clientId: string) {
    const assessment = await prisma.weeklyAssessment.findFirst({
      where: { id, clientId },
      include: ASSESSMENT_INCLUDE,
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    return assessment;
  }
}
