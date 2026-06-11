import {
  Injectable,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { prisma, Role } from '@hone/database';
import { MailService } from '../mail/mail.service';
import type { CreateStaffDto } from './dto/create-staff.dto';
import type { UpdateStaffDto } from './dto/update-staff.dto';
import type { CurrentUserType } from '../common/decorators/current-user.decorator';

const STAFF_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  organizationId: true,
  branchId: true,
  phone: true,
  photoUrl: true,
  dateOfBirth: true,
  gender: true,
  employeeId: true,
  hireDate: true,
  emergencyContactName: true,
  emergencyContactPhone: true,
  bio: true,
  specializations: true,
  certifications: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class StaffService {
  constructor(private mail: MailService) {}
  async findAll(
    organizationId: string,
    user: CurrentUserType,
    roleFilter?: string,
  ) {
    const STAFF_ROLES = [Role.BRANCH_MANAGER, Role.TRAINER] as string[];
    const roleWhere =
      roleFilter && STAFF_ROLES.includes(roleFilter)
        ? { role: roleFilter as Role }
        : { role: { in: [Role.BRANCH_MANAGER, Role.TRAINER] } };

    // BRANCH_MANAGER and TRAINER see only their own branch
    const branchWhere =
      (user.role === Role.BRANCH_MANAGER || user.role === Role.TRAINER) && user.branchId
        ? { branchId: user.branchId }
        : {};

    return prisma.user.findMany({
      where: {
        // Staff may be linked via their branch OR directly via organizationId
        // (e.g. invited staff who haven't been assigned a branch yet)
        OR: [{ branch: { organizationId } }, { organizationId }],
        ...roleWhere,
        ...branchWhere,
        deletedAt: null,
      },
      select: STAFF_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  async create(organizationId: string, dto: CreateStaffDto) {
    // Validate the branch belongs to this org
    const branch = await prisma.branch.findFirst({
      where: { id: dto.branchId, organizationId, deletedAt: null },
    });
    if (!branch) throw new BadRequestException('Branch not found in this organization');

    const existing = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.role as Role,
        // No organizationId — the org is inferred through branchId
        branchId: dto.branchId,
        phone: dto.phone,
        photoUrl: dto.photoUrl,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        employeeId: dto.employeeId,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
        bio: dto.bio,
        specializations: dto.specializations ?? [],
        certifications: dto.certifications ?? [],
      },
      select: STAFF_SELECT,
    });
  }

  async findOne(id: string, organizationId: string, user?: CurrentUserType) {
    const staff = await prisma.user.findFirst({
      where: {
        id,
        OR: [{ branch: { organizationId } }, { organizationId }],
        role: { in: [Role.BRANCH_MANAGER, Role.TRAINER] },
        deletedAt: null,
      },
      select: STAFF_SELECT,
    });
    if (!staff) throw new NotFoundException('Staff member not found');

    // BRANCH_MANAGER and TRAINER can only view staff in their own branch
    if (
      user &&
      (user.role === Role.BRANCH_MANAGER || user.role === Role.TRAINER) &&
      user.branchId &&
      staff.branchId !== user.branchId
    ) {
      throw new ForbiddenException('Access restricted to your branch');
    }

    return staff;
  }

  async update(id: string, organizationId: string, dto: UpdateStaffDto) {
    await this.findOne(id, organizationId, undefined);

    if (dto.branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: dto.branchId, organizationId, deletedAt: null },
      });
      if (!branch) throw new BadRequestException('Branch not found in this organization');
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.branchId !== undefined) data.branchId = dto.branchId;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.photoUrl !== undefined) data.photoUrl = dto.photoUrl;
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.employeeId !== undefined) data.employeeId = dto.employeeId;
    if (dto.emergencyContactName !== undefined)
      data.emergencyContactName = dto.emergencyContactName;
    if (dto.emergencyContactPhone !== undefined)
      data.emergencyContactPhone = dto.emergencyContactPhone;
    if (dto.bio !== undefined) data.bio = dto.bio;
    if (dto.specializations !== undefined) data.specializations = dto.specializations;
    if (dto.certifications !== undefined) data.certifications = dto.certifications;
    if (dto.dateOfBirth !== undefined)
      data.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    if (dto.hireDate !== undefined)
      data.hireDate = dto.hireDate ? new Date(dto.hireDate) : null;

    return prisma.user.update({ where: { id }, data, select: STAFF_SELECT });
  }

  async remove(id: string, organizationId: string): Promise<{ ok: boolean }> {
    await this.findOne(id, organizationId, undefined);
    await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }

  // ── Flow 4: Staff invite by email ─────────────────────────────────────────

  async invite(
    organizationId: string,
    dto: { name: string; email: string; role: string; branchId?: string; employeeId?: string },
  ) {
    const existing = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    const member = await prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash: '', // no password until invite is accepted
        role: dto.role as Role,
        organizationId,
        branchId: dto.branchId,
        employeeId: dto.employeeId,
        passwordResetToken: inviteToken,
        passwordResetExpiry: inviteExpiry,
      },
      select: STAFF_SELECT,
    });

    const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
    const roleName = dto.role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

    this.mail.sendStaffInvite(
      dto.email, dto.name, org?.name ?? 'your gym', roleName, inviteToken,
    ).catch(() => null);

    return member;
  }
}
