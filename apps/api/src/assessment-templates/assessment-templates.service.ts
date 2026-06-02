import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { prisma, Role } from '@hone/database';
import type { CreateTemplateDto } from './dto/create-template.dto';
import type { UpdateTemplateDto } from './dto/update-template.dto';
import type { CurrentUserType } from '../common/decorators/current-user.decorator';

const TEMPLATE_INCLUDE = {
  createdBy: { select: { id: true, name: true } },
  organization: { select: { id: true, name: true, slug: true } },
};

@Injectable()
export class AssessmentTemplatesService {
  async findAll(user: CurrentUserType, organizationSlug?: string): Promise<unknown> {
    let orgId: string | null = null;

    if (organizationSlug) {
      const org = await prisma.organization.findUnique({
        where: { slug: organizationSlug, deletedAt: null },
        select: { id: true },
      });
      if (!org) throw new NotFoundException(`Gym "${organizationSlug}" not found`);

      // Verify caller belongs to this org (SUPER_ADMIN always passes)
      if (user.role !== Role.SUPER_ADMIN) {
        const belongs = await this.userBelongsToOrg(user, org.id);
        if (!belongs) throw new ForbiddenException('You do not belong to this organization');
      }
      orgId = org.id;
    }

    return prisma.assessmentTemplate.findMany({
      where: {
        isActive: true,
        OR: [
          { organizationId: null },
          ...(orgId ? [{ organizationId: orgId }] : []),
        ],
      },
      include: TEMPLATE_INCLUDE,
      orderBy: [{ organizationId: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async create(orgId: string, user: CurrentUserType, dto: CreateTemplateDto): Promise<unknown> {
    return prisma.assessmentTemplate.create({
      data: {
        organizationId: orgId,
        createdById: user.id,
        name: dto.name,
        description: dto.description,
        fields: dto.fields as object[],
      },
      include: TEMPLATE_INCLUDE,
    });
  }

  async update(
    id: string,
    orgId: string,
    user: CurrentUserType,
    dto: UpdateTemplateDto,
  ): Promise<unknown> {
    const template = await this.findOrgTemplate(id, orgId);

    // Only creator or ORG_ADMIN can update
    if (user.role !== Role.ORG_ADMIN && user.role !== Role.SUPER_ADMIN) {
      if (template.createdById !== user.id) {
        throw new ForbiddenException('Only the creator or an admin can update this template');
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.fields !== undefined) data.fields = dto.fields;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return prisma.assessmentTemplate.update({
      where: { id },
      data,
      include: TEMPLATE_INCLUDE,
    });
  }

  async deactivate(id: string, orgId: string, user: CurrentUserType): Promise<unknown> {
    // ORG_ADMIN only — checked at controller level via @Roles, but double-check
    if (user.role !== Role.ORG_ADMIN && user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only org admins can delete templates');
    }
    await this.findOrgTemplate(id, orgId);
    return prisma.assessmentTemplate.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, isActive: true },
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async findOrgTemplate(id: string, orgId: string) {
    const template = await prisma.assessmentTemplate.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!template) throw new NotFoundException('Assessment template not found');
    return template;
  }

  private async userBelongsToOrg(user: CurrentUserType, orgId: string): Promise<boolean> {
    if (user.organizationId === orgId) return true;
    if (user.branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: user.branchId, deletedAt: null },
        select: { organizationId: true },
      });
      return branch?.organizationId === orgId;
    }
    return false;
  }
}
