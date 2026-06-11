import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { prisma, Role, AssessmentStatus } from '@hone/database';
import { NotificationsService } from '../notifications/notifications.service';
import type { CreateAssessmentDto } from './dto/create-assessment.dto';
import type { ListAssessmentsDto } from './dto/list-assessments.dto';
import type { ReviewAssessmentDto } from './dto/review-assessment.dto';
import type { SubmitAssessmentDto } from './dto/submit-assessment.dto';
import type { PaginationDto } from '../common/pagination/pagination.dto';
import type { CurrentUserType } from '../common/decorators/current-user.decorator';

const ASSESSMENT_INCLUDE = {
  template: { select: { id: true, name: true, description: true, fields: true } },
  client: { select: { id: true, name: true, email: true, photoUrl: true, branchId: true } },
  trainer: { select: { id: true, name: true, email: true } },
};

interface TemplateField {
  id: string;
  label: string;
  type: string;
  unit?: string;
  required: boolean;
  options?: string[];
}

@Injectable()
export class AssessmentsService {
  private readonly logger = new Logger(AssessmentsService.name);

  constructor(private readonly notifications: NotificationsService) {}

  // ── Staff — list ─────────────────────────────────────────────────────────

  async findAll(
    orgId: string,
    user: CurrentUserType,
    query: ListAssessmentsDto,
  ): Promise<unknown> {
    const { clientId, status, templateId, page = 1, limit = 20 } = query;

    const branchFilter =
      (user.role === Role.TRAINER || user.role === Role.BRANCH_MANAGER) && user.branchId
        ? { branchId: user.branchId }
        : {};

    const where = {
      organizationId: orgId,
      ...(clientId ? { clientId } : {}),
      ...(status ? { status: status as AssessmentStatus } : {}),
      ...(templateId ? { templateId } : {}),
      client: { deletedAt: null, ...branchFilter },
    };

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.assessment.findMany({
        where,
        include: ASSESSMENT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.assessment.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ── Staff — single ───────────────────────────────────────────────────────

  async findOne(id: string, orgId: string, user: CurrentUserType): Promise<unknown> {
    const assessment = await prisma.assessment.findFirst({
      where: { id, organizationId: orgId },
      include: ASSESSMENT_INCLUDE,
    });
    if (!assessment) throw new NotFoundException('Assessment not found');

    this.enforceBranchAccess(user, assessment.client.branchId);

    return assessment;
  }

  // ── Staff — create ───────────────────────────────────────────────────────

  async create(
    orgId: string,
    user: CurrentUserType,
    dto: CreateAssessmentDto,
  ): Promise<unknown> {
    // Validate template belongs to org or is global
    const template = await prisma.assessmentTemplate.findFirst({
      where: {
        id: dto.templateId,
        isActive: true,
        OR: [{ organizationId: null }, { organizationId: orgId }],
      },
    });
    if (!template) throw new BadRequestException('Template not found or not available to this org');

    // Validate client belongs to org
    const client = await prisma.user.findFirst({
      where: {
        id: dto.clientId,
        role: Role.CLIENT,
        branch: { organizationId: orgId },
        deletedAt: null,
      },
      select: { id: true, branchId: true },
    });
    if (!client) throw new BadRequestException('Client not found in this organization');

    // TRAINER/BRANCH_MANAGER: client must be in same branch
    if (
      (user.role === Role.TRAINER || user.role === Role.BRANCH_MANAGER) &&
      user.branchId &&
      client.branchId !== user.branchId
    ) {
      throw new ForbiddenException('You can only assign assessments to clients in your branch');
    }

    const trainerId = dto.trainerId ?? user.id;

    const assessment = await prisma.assessment.create({
      data: {
        templateId: dto.templateId,
        clientId: dto.clientId,
        trainerId,
        organizationId: orgId,
        responses: {},
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
        weekNumber: dto.weekNumber,
        year: dto.year,
        trainerNotes: dto.trainerNotes,
        status: AssessmentStatus.PENDING,
      },
      include: ASSESSMENT_INCLUDE,
    });

    this.notifications.onAssessmentAssigned(assessment.id)
      .catch((err) => this.logger.error('onAssessmentAssigned failed', err));

    return assessment;
  }

  // ── Staff — review ───────────────────────────────────────────────────────

  async review(
    id: string,
    orgId: string,
    user: CurrentUserType,
    dto: ReviewAssessmentDto,
  ): Promise<unknown> {
    const assessment = await prisma.assessment.findFirst({
      where: { id, organizationId: orgId },
      include: { client: { select: { branchId: true } } },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');

    this.enforceBranchAccess(user, assessment.client.branchId);

    const data: Record<string, unknown> = {};
    if (dto.trainerNotes !== undefined) data.trainerNotes = dto.trainerNotes;
    if (dto.overallRating !== undefined) data.overallRating = dto.overallRating;
    if (dto.status !== undefined) data.status = dto.status as AssessmentStatus;

    return prisma.assessment.update({
      where: { id },
      data,
      include: ASSESSMENT_INCLUDE,
    });
  }

  // ── Staff — delete ───────────────────────────────────────────────────────

  async remove(id: string, orgId: string): Promise<unknown> {
    const assessment = await prisma.assessment.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');

    await prisma.assessment.delete({ where: { id } });
    return { ok: true };
  }

  // ── Client-facing ────────────────────────────────────────────────────────

  async findAllForClient(clientId: string, pagination: PaginationDto): Promise<unknown> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;
    const where = { clientId };

    const [data, total] = await Promise.all([
      prisma.assessment.findMany({
        where,
        include: ASSESSMENT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.assessment.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOneForClient(id: string, clientId: string): Promise<unknown> {
    const assessment = await prisma.assessment.findFirst({
      where: { id, clientId },
      include: ASSESSMENT_INCLUDE,
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    return assessment;
  }

  async submit(
    id: string,
    clientId: string,
    dto: SubmitAssessmentDto,
  ): Promise<unknown> {
    const assessment = await prisma.assessment.findFirst({
      where: { id },
      include: { template: { select: { fields: true } } },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');

    // Only the assigned client can submit
    if (assessment.clientId !== clientId) {
      throw new ForbiddenException('You can only submit your own assessments');
    }

    if (assessment.status !== AssessmentStatus.PENDING) {
      throw new BadRequestException(
        `Assessment is already ${assessment.status.toLowerCase()} and cannot be resubmitted`,
      );
    }

    // Validate required fields
    const fields = assessment.template.fields as unknown as TemplateField[];
    const missing = fields
      .filter((field) => field.required)
      .filter((field) => {
        const val = dto.responses[field.id];
        return val === undefined || val === null || val === '';
      });

    if (missing.length > 0) {
      throw new BadRequestException(
        `Missing required fields: ${missing.map((field) => field.label).join(', ')}`,
      );
    }

    const submitted = await prisma.assessment.update({
      where: { id },
      data: {
        responses: dto.responses as object,
        completedAt: new Date(),
        status: AssessmentStatus.SUBMITTED,
      },
      include: ASSESSMENT_INCLUDE,
    });

    this.notifications.onAssessmentSubmitted(submitted.id)
      .catch((err) => this.logger.error('onAssessmentSubmitted failed', err));

    return submitted;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private enforceBranchAccess(user: CurrentUserType, clientBranchId: string | null) {
    if (
      (user.role === Role.TRAINER || user.role === Role.BRANCH_MANAGER) &&
      user.branchId &&
      clientBranchId !== user.branchId
    ) {
      throw new ForbiddenException('Access restricted to your branch');
    }
  }
}
