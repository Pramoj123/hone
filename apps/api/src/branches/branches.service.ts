import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { prisma, Role, type Branch } from '@hone/database';
import type { CreateBranchDto } from './dto/create-branch.dto';
import type { UpdateBranchDto } from './dto/update-branch.dto';
import type { CurrentUserType } from '../common/decorators/current-user.decorator';

const BRANCH_SCOPED_ROLES = [Role.BRANCH_MANAGER, Role.TRAINER] as Role[];

@Injectable()
export class BranchesService {
  findAll(organizationId: string, user: CurrentUserType): Promise<Branch[]> {
    // BRANCH_MANAGER and TRAINER see only their own branch
    if (BRANCH_SCOPED_ROLES.includes(user.role) && user.branchId) {
      return prisma.branch.findMany({
        where: { id: user.branchId, organizationId, deletedAt: null },
      });
    }
    return prisma.branch.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  create(organizationId: string, dto: CreateBranchDto): Promise<Branch> {
    return prisma.branch.create({
      data: {
        organizationId,
        name: dto.name,
        timezone: dto.timezone ?? 'UTC',
        address: dto.address,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        postalCode: dto.postalCode,
        phone: dto.phone,
        email: dto.email,
        openingHours: dto.openingHours,
        capacity: dto.capacity,
        description: dto.description,
      },
    });
  }

  async findOne(
    id: string,
    organizationId: string,
    user: CurrentUserType,
  ): Promise<Branch> {
    // BRANCH_MANAGER and TRAINER can only access their own branch
    if (BRANCH_SCOPED_ROLES.includes(user.role) && user.branchId !== id) {
      throw new ForbiddenException('Access restricted to your branch');
    }
    const branch = await prisma.branch.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async update(
    id: string,
    organizationId: string,
    dto: UpdateBranchDto,
  ): Promise<Branch> {
    const branch = await prisma.branch.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return prisma.branch.update({ where: { id }, data: dto as Partial<Branch> });
  }

  async remove(id: string, organizationId: string): Promise<{ ok: boolean }> {
    const branch = await prisma.branch.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    if (branch.isDefault)
      throw new ForbiddenException('Cannot delete the default branch');
    await prisma.branch.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }
}
