import {
  Injectable,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { prisma, Role } from '@hone/database';
import { MailService } from '../mail/mail.service';
import type { CreateMemberDto } from './dto/create-member.dto';
import type { UpdateMemberProfileDto } from './dto/update-member-profile.dto';
import type { CurrentUserType } from '../common/decorators/current-user.decorator';

const MEMBER_SELECT = {
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
  memberNumber: true,
  fitnessGoals: true,
  referredBy: true,
  emergencyContactName: true,
  emergencyContactPhone: true,
  healthNotes: true,
  createdAt: true,
  updatedAt: true,
  memberProfile: true,
};

@Injectable()
export class MembersService {
  constructor(private mail: MailService) {}
  async findAll(organizationId: string, user: CurrentUserType) {
    // BRANCH_MANAGER and TRAINER see only their own branch
    const branchWhere =
      (user.role === Role.BRANCH_MANAGER || user.role === Role.TRAINER) && user.branchId
        ? { branchId: user.branchId }
        : {};

    return prisma.user.findMany({
      where: {
        branch: { organizationId },
        role: Role.CLIENT,
        ...branchWhere,
        deletedAt: null,
      },
      select: MEMBER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(organizationId: string, dto: CreateMemberDto) {
    // Validate the branch belongs to this org
    const branch = await prisma.branch.findFirst({
      where: { id: dto.branchId, organizationId, deletedAt: null },
    });
    if (!branch) throw new BadRequestException('Branch not found in this organization');

    const existing = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return prisma.$transaction(async (tx) => {
      const member = await tx.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          passwordHash,
          role: Role.CLIENT,
          // No organizationId — the org is inferred through branchId
          branchId: dto.branchId,
          phone: dto.phone,
          photoUrl: dto.photoUrl,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          gender: dto.gender,
          memberNumber: dto.memberNumber,
          fitnessGoals: dto.fitnessGoals,
          referredBy: dto.referredBy,
          emergencyContactName: dto.emergencyContactName,
          emergencyContactPhone: dto.emergencyContactPhone,
          healthNotes: dto.healthNotes,
        },
        select: MEMBER_SELECT,
      });
      await tx.memberProfile.create({ data: { userId: member.id } });
      return member;
    }).then((member) => {
      this.mail.sendWelcome(member.email, member.name).catch(() => null);
      return member;
    });
  }

  async findOne(id: string, organizationId: string, user?: CurrentUserType) {
    const member = await prisma.user.findFirst({
      where: {
        id,
        branch: { organizationId },
        role: Role.CLIENT,
        deletedAt: null,
      },
      select: MEMBER_SELECT,
    });
    if (!member) throw new NotFoundException('Member not found');

    // BRANCH_MANAGER and TRAINER can only view members in their own branch
    if (
      user &&
      (user.role === Role.BRANCH_MANAGER || user.role === Role.TRAINER) &&
      user.branchId &&
      member.branchId !== user.branchId
    ) {
      throw new ForbiddenException('Access restricted to your branch');
    }

    return member;
  }

  async update(id: string, organizationId: string, dto: Partial<CreateMemberDto>) {
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
    if (dto.memberNumber !== undefined) data.memberNumber = dto.memberNumber;
    if (dto.fitnessGoals !== undefined) data.fitnessGoals = dto.fitnessGoals;
    if (dto.referredBy !== undefined) data.referredBy = dto.referredBy;
    if (dto.emergencyContactName !== undefined)
      data.emergencyContactName = dto.emergencyContactName;
    if (dto.emergencyContactPhone !== undefined)
      data.emergencyContactPhone = dto.emergencyContactPhone;
    if (dto.healthNotes !== undefined) data.healthNotes = dto.healthNotes;
    if (dto.dateOfBirth !== undefined)
      data.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;

    return prisma.user.update({ where: { id }, data, select: MEMBER_SELECT });
  }

  async updateProfile(
    memberId: string,
    organizationId: string,
    dto: UpdateMemberProfileDto,
  ) {
    await this.findOne(memberId, organizationId);
    const data: Record<string, unknown> = {};
    if (dto.height !== undefined) data.height = dto.height;
    if (dto.weight !== undefined) data.weight = dto.weight;
    if (dto.bloodType !== undefined) data.bloodType = dto.bloodType;
    if (dto.medicalConditions !== undefined) data.medicalConditions = dto.medicalConditions;
    if (dto.allergies !== undefined) data.allergies = dto.allergies;
    if (dto.currentMedications !== undefined) data.currentMedications = dto.currentMedications;
    if (dto.pastInjuries !== undefined) data.pastInjuries = dto.pastInjuries;
    if (dto.pastSurgeries !== undefined) data.pastSurgeries = dto.pastSurgeries;
    if (dto.physicianName !== undefined) data.physicianName = dto.physicianName;
    if (dto.physicianPhone !== undefined) data.physicianPhone = dto.physicianPhone;
    if (dto.hasSignedWaiver !== undefined) data.hasSignedWaiver = dto.hasSignedWaiver;
    if (dto.fitnessLevel !== undefined) data.fitnessLevel = dto.fitnessLevel;
    if (dto.primaryGoal !== undefined) data.primaryGoal = dto.primaryGoal;
    if (dto.waiverSignedAt !== undefined)
      data.waiverSignedAt = dto.waiverSignedAt ? new Date(dto.waiverSignedAt) : null;

    return prisma.memberProfile.upsert({
      where: { userId: memberId },
      update: data,
      create: { userId: memberId, ...data },
    });
  }

  async remove(id: string, organizationId: string): Promise<{ ok: boolean }> {
    await this.findOne(id, organizationId, undefined);
    await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }
}
