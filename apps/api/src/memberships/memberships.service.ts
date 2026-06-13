import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { prisma, Role, MembershipStatus, ProgramStatus, PlanStatus, ProgramSource } from '@hone/database';
import type { JoinGymDto } from './dto/join-gym.dto';
import type { ApproveMembershipDto } from './dto/approve-membership.dto';
import type { CurrentUserType } from '../common/decorators/current-user.decorator';
import * as crypto from 'crypto';

const MEMBERSHIP_ORG_SELECT = {
  id: true,
  name: true,
  slug: true,
};

const MEMBERSHIP_BRANCH_SELECT = {
  id: true,
  name: true,
};

export const MEMBERSHIP_INCLUDE = {
  organization: { select: MEMBERSHIP_ORG_SELECT },
  branch: { select: MEMBERSHIP_BRANCH_SELECT },
  decidedBy: { select: { id: true, name: true } },
};

@Injectable()
export class MembershipsService {

  async getMyMembership(userId: string) {
    const all = await prisma.membership.findMany({
      where: { userId },
      include: { ...MEMBERSHIP_INCLUDE, user: false },
      orderBy: { updatedAt: 'desc' },
    });

    const active = all.find((m) => m.status === MembershipStatus.ACTIVE) ?? null;
    const pending = all.find((m) => m.status === MembershipStatus.PENDING) ?? null;
    const history = all.filter((m) => m.status === MembershipStatus.ENDED);

    return { active, pending, history };
  }

  async joinGym(userId: string, dto: JoinGymDto) {
    const org = await prisma.organization.findUnique({
      where: { slug: dto.slug, deletedAt: null },
    });
    if (!org) throw new NotFoundException(`Gym "${dto.slug}" not found`);

    if (dto.branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: dto.branchId, organizationId: org.id, deletedAt: null },
      });
      if (!branch) throw new BadRequestException('Branch not found in this gym');
    }

    // Conflict check + upsert inside a transaction to prevent double-join race
    await prisma.$transaction(async (tx) => {
      const existing = await tx.membership.findFirst({
        where: {
          userId,
          status: { in: [MembershipStatus.ACTIVE, MembershipStatus.PENDING] },
        },
      });
      if (existing) throw new ConflictException('You already have an active or pending gym membership');

      // Upsert — reuse ENDED row for this org if one exists
      await tx.membership.upsert({
        where: { userId_organizationId: { userId, organizationId: org.id } },
        update: {
          status: MembershipStatus.PENDING,
          branchId: dto.branchId ?? null,
          requestNote: dto.note ?? null,
          endedAt: null,
          endReason: null,
          decidedById: null,
          joinedAt: null,
        },
        create: {
          userId,
          organizationId: org.id,
          branchId: dto.branchId ?? null,
          requestNote: dto.note ?? null,
          status: MembershipStatus.PENDING,
        },
      });
    });

    return prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId: org.id } },
      include: MEMBERSHIP_INCLUDE,
    });
  }

  async cancelPendingRequest(userId: string) {
    const pending = await prisma.membership.findFirst({
      where: { userId, status: MembershipStatus.PENDING },
    });
    if (!pending) throw new NotFoundException('No pending membership request found');

    return prisma.membership.update({
      where: { id: pending.id },
      data: { status: MembershipStatus.ENDED, endedAt: new Date(), endReason: 'CANCELLED' },
      include: MEMBERSHIP_INCLUDE,
    });
  }

  async leaveGym(userId: string, endReason: 'LEFT' | 'TRANSFERRED' = 'LEFT') {
    const active = await prisma.membership.findFirst({
      where: { userId, status: MembershipStatus.ACTIVE },
      include: { organization: { select: { id: true } } },
    });
    if (!active) throw new NotFoundException('No active gym membership found');

    await prisma.$transaction(async (tx) => {
      // End membership
      await tx.membership.update({
        where: { id: active.id },
        data: { status: MembershipStatus.ENDED, endedAt: new Date(), endReason },
      });

      // Cancel TRAINER-source programs (SELF/AI survive)
      await tx.workoutProgram.updateMany({
        where: {
          clientId: userId,
          source: ProgramSource.TRAINER,
          status: { in: [ProgramStatus.PENDING, ProgramStatus.ACTIVE] },
          deletedAt: null,
        },
        data: { status: ProgramStatus.CANCELLED },
      });

      // Cancel TRAINER-source plans
      await tx.programPlan.updateMany({
        where: {
          clientId: userId,
          source: ProgramSource.TRAINER,
          status: { in: [PlanStatus.DRAFT, PlanStatus.ACTIVE] },
          deletedAt: null,
        },
        data: { status: PlanStatus.CANCELLED },
      });

      // Clear denormalized gym pointer
      await tx.user.update({
        where: { id: userId },
        data: { branchId: null, memberNumber: null },
      });
    });

    return { ok: true };
  }

  async transferGym(userId: string, newSlug: string) {
    const newOrg = await prisma.organization.findUnique({
      where: { slug: newSlug, deletedAt: null },
    });
    if (!newOrg) throw new NotFoundException(`Gym "${newSlug}" not found`);

    const active = await prisma.membership.findFirst({
      where: { userId, status: MembershipStatus.ACTIVE },
    });
    if (!active) throw new NotFoundException('No active gym membership to transfer from');

    if (active.organizationId === newOrg.id) {
      throw new ConflictException('You are already a member of that gym');
    }

    await prisma.$transaction(async (tx) => {
      // End current membership
      await tx.membership.update({
        where: { id: active.id },
        data: { status: MembershipStatus.ENDED, endedAt: new Date(), endReason: 'TRANSFERRED' },
      });

      // Cancel trainer-source programs and plans
      await tx.workoutProgram.updateMany({
        where: {
          clientId: userId,
          source: ProgramSource.TRAINER,
          status: { in: [ProgramStatus.PENDING, ProgramStatus.ACTIVE] },
          deletedAt: null,
        },
        data: { status: ProgramStatus.CANCELLED },
      });
      await tx.programPlan.updateMany({
        where: {
          clientId: userId,
          source: ProgramSource.TRAINER,
          status: { in: [PlanStatus.DRAFT, PlanStatus.ACTIVE] },
          deletedAt: null,
        },
        data: { status: PlanStatus.CANCELLED },
      });

      // Clear denormalized gym pointer
      await tx.user.update({
        where: { id: userId },
        data: { branchId: null, memberNumber: null },
      });

      // Create PENDING membership at new gym (upsert reuses ENDED row if it exists)
      await tx.membership.upsert({
        where: { userId_organizationId: { userId, organizationId: newOrg.id } },
        update: {
          status: MembershipStatus.PENDING,
          branchId: null,
          requestNote: null,
          endedAt: null,
          endReason: null,
          decidedById: null,
          joinedAt: null,
        },
        create: {
          userId,
          organizationId: newOrg.id,
          status: MembershipStatus.PENDING,
        },
      });
    });

    return prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId: newOrg.id } },
      include: MEMBERSHIP_INCLUDE,
    });
  }

  // ── Staff-facing ───────────────────────────────────────────────────────────

  async listRequests(
    organizationId: string,
    user: CurrentUserType,
    status?: string,
    page = 1,
    limit = 20,
  ) {
    const statusFilter = status
      ? { status: status as MembershipStatus }
      : { status: MembershipStatus.PENDING };

    const branchFilter =
      user.role === Role.BRANCH_MANAGER && user.branchId
        ? { OR: [{ branchId: user.branchId }, { branchId: null }] }
        : {};

    const where = { organizationId, ...statusFilter, ...branchFilter };
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.membership.findMany({
        where,
        include: {
          ...MEMBERSHIP_INCLUDE,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              photoUrl: true,
              phone: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.membership.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async approveMembership(
    membershipId: string,
    organizationId: string,
    decidedById: string,
    dto: ApproveMembershipDto,
  ) {
    const membership = await prisma.membership.findFirst({
      where: { id: membershipId, organizationId, status: MembershipStatus.PENDING },
    });
    if (!membership) throw new NotFoundException('Membership request not found');

    // Validate branch belongs to org
    const branch = await prisma.branch.findFirst({
      where: { id: dto.branchId, organizationId, deletedAt: null },
    });
    if (!branch) throw new BadRequestException('Branch not found in this organization');

    const memberNumber = dto.memberNumber ?? `MEM-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // alreadyActive check + approval inside a single transaction to prevent
    // two admins from simultaneously approving the same user at different gyms
    await prisma.$transaction(async (tx) => {
      const alreadyActive = await tx.membership.findFirst({
        where: {
          userId: membership.userId,
          status: MembershipStatus.ACTIVE,
          id: { not: membershipId },
        },
      });
      if (alreadyActive) throw new ConflictException('Member is already active at another gym');

      await tx.membership.update({
        where: { id: membershipId },
        data: {
          status: MembershipStatus.ACTIVE,
          branchId: dto.branchId,
          memberNumber,
          joinedAt: new Date(),
          decidedById,
        },
      });

      await tx.user.update({
        where: { id: membership.userId },
        data: { branchId: dto.branchId, memberNumber },
      });

      await tx.memberProfile.upsert({
        where: { userId: membership.userId },
        update: {},
        create: { userId: membership.userId },
      });
    });

    return prisma.membership.findUnique({
      where: { id: membershipId },
      include: { ...MEMBERSHIP_INCLUDE, user: { select: { id: true, name: true, email: true } } },
    });
  }

  async rejectMembership(
    membershipId: string,
    organizationId: string,
    decidedById: string,
    reason?: string,
  ) {
    const membership = await prisma.membership.findFirst({
      where: { id: membershipId, organizationId, status: MembershipStatus.PENDING },
    });
    if (!membership) throw new NotFoundException('Membership request not found');

    return prisma.membership.update({
      where: { id: membershipId },
      data: {
        status: MembershipStatus.ENDED,
        endedAt: new Date(),
        endReason: 'REJECTED',
        decidedById,
        // Keep the member's original note unless staff provided a rejection reason
        ...(reason ? { requestNote: reason } : {}),
      },
      include: MEMBERSHIP_INCLUDE,
    });
  }

  // Called from members.service.ts when staff create or invite a member
  async createActiveMembership(
    userId: string,
    organizationId: string,
    branchId: string,
    memberNumber: string | undefined,
    decidedById: string | null,
  ) {
    await prisma.membership.upsert({
      where: { userId_organizationId: { userId, organizationId } },
      update: {
        status: MembershipStatus.ACTIVE,
        branchId,
        memberNumber: memberNumber ?? null,
        joinedAt: new Date(),
        decidedById,
        endedAt: null,
        endReason: null,
      },
      create: {
        userId,
        organizationId,
        branchId,
        memberNumber: memberNumber ?? null,
        status: MembershipStatus.ACTIVE,
        joinedAt: new Date(),
        decidedById,
      },
    });
  }
}
