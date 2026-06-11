import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { prisma, Role, type Organization, type Branch, type User } from '@hone/database';
import { CreateGymDto } from './dto/create-gym.dto';
import { paginate } from '../common/pagination/paginate.helper';
import type { PaginatedResult } from '../common/pagination/paginated-result.type';
import type { PaginationDto } from '../common/pagination/pagination.dto';
import type { CurrentUserType } from '../common/decorators/current-user.decorator';

export interface GymListItem extends Organization {
  _count: { users: number; branches: number };
}

export interface GymDetail extends Organization {
  _count: { users: number; branches: number };
  branches: Branch[];
}

export interface CreateGymResult {
  organization: Organization;
  orgAdmin: Pick<User, 'id' | 'name' | 'email' | 'role'>;
}

const RESERVED_SLUGS = new Set([
  'admin', 'api', 'www', 'app', 'hone', 'dashboard', 'login', 'register',
]);

@Injectable()
export class GymsService {
  async create(dto: CreateGymDto): Promise<CreateGymResult> {
    if (RESERVED_SLUGS.has(dto.slug)) {
      throw new ConflictException(`Slug "${dto.slug}" is reserved`);
    }

    const [slugTaken, emailTaken] = await Promise.all([
      prisma.organization.findUnique({ where: { slug: dto.slug } }),
      prisma.user.findUnique({ where: { email: dto.orgAdminEmail } }),
    ]);

    if (slugTaken) throw new ConflictException('Slug already taken');
    if (emailTaken) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.orgAdminPassword, 10);

    return prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          address: dto.address,
          city: dto.city,
          state: dto.state,
          country: dto.country,
          postalCode: dto.postalCode,
          phone: dto.phone,
          publicEmail: dto.publicEmail,
          website: dto.website,
          timezone: dto.timezone ?? 'UTC',
          currency: dto.currency ?? 'USD',
          openingHours: dto.openingHours,
          logoUrl: dto.logoUrl,
          primaryColor: dto.primaryColor,
        },
      });

      await tx.branch.create({
        data: { organizationId: org.id, name: 'Main Branch', isDefault: true },
      });

      const orgAdmin = await tx.user.create({
        data: {
          name: dto.orgAdminName,
          email: dto.orgAdminEmail,
          passwordHash,
          role: Role.ORG_ADMIN,
          organizationId: org.id,
        },
        select: { id: true, name: true, email: true, role: true },
      });

      return { organization: org, orgAdmin };
    });
  }

  async findBySlug(slug: string): Promise<GymDetail> {
    const org = await prisma.organization.findUnique({
      where: { slug, deletedAt: null },
      include: {
        branches: { where: { deletedAt: null }, orderBy: { isDefault: 'desc' } },
        _count: { select: { users: true, branches: true } },
      },
    });
    if (!org) throw new NotFoundException(`Gym "${slug}" not found`);
    return org as GymDetail;
  }

  async getStats(organizationId: string, user: CurrentUserType) {
    // BRANCH_MANAGER is scoped to their branch; others see the whole org
    const branchScope =
      user.role === Role.BRANCH_MANAGER && user.branchId
        ? { branchId: user.branchId }
        : { branch: { organizationId } };

    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);

    const [totalMembers, activeTrainers, branchCount, newMembersThisMonth] =
      await Promise.all([
        prisma.user.count({
          where: { ...branchScope, role: Role.CLIENT, deletedAt: null },
        }),
        prisma.user.count({
          where: {
            OR: [{ branch: { organizationId } }, { organizationId }],
            role: Role.TRAINER,
            deletedAt: null,
          },
        }),
        prisma.branch.count({
          where: { organizationId, deletedAt: null },
        }),
        prisma.user.count({
          where: {
            ...branchScope,
            role: Role.CLIENT,
            deletedAt: null,
            createdAt: { gte: firstOfMonth },
          },
        }),
      ]);

    return { totalMembers, activeTrainers, branchCount, newMembersThisMonth };
  }

  async findAll(pagination: PaginationDto): Promise<PaginatedResult<GymListItem>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const where = { deletedAt: null };
    const orderBy = { createdAt: 'desc' as const };
    const include = { _count: { select: { users: true, branches: true } } };

    const [data, total] = await Promise.all([
      prisma.organization.findMany({ where, orderBy, include, skip, take: limit }),
      prisma.organization.count({ where }),
    ]);

    return {
      data: data as GymListItem[],
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
