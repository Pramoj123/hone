import {
  Injectable,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { prisma, Role, ProgramStatus } from '@hone/database';
import { MailService } from '../mail/mail.service';
import type { CreateMemberDto } from './dto/create-member.dto';
import type { UpdateMemberProfileDto } from './dto/update-member-profile.dto';
import type { ListMyClientsDto } from './dto/list-my-clients.dto';
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

  async findMyClients(
    organizationId: string,
    trainerId: string,
    dto: ListMyClientsDto,
  ): Promise<unknown> {
    const { search, page = 1, limit = 20 } = dto;

    const searchWhere = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const baseWhere = {
      trainerId,
      deletedAt: null,
      client: {
        branch: { organizationId },
        deletedAt: null,
        ...searchWhere,
      },
    };

    // Distinct client IDs — Prisma distinct + pagination
    const allDistinct = await prisma.workoutProgram.findMany({
      where: baseWhere,
      select: { clientId: true },
      distinct: ['clientId'],
      orderBy: { createdAt: 'desc' },
    });

    const total = allDistinct.length;
    const pagedIds = allDistinct
      .slice((page - 1) * limit, page * limit)
      .map((row) => row.clientId);

    if (pagedIds.length === 0) {
      return { data: [], total, page, limit };
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Fetch all programs this trainer has with these clients (for stat computation)
    const programs = await prisma.workoutProgram.findMany({
      where: { trainerId, clientId: { in: pagedIds }, deletedAt: null },
      select: {
        clientId: true,
        status: true,
        createdAt: true,
        logs: {
          select: { completedAt: true },
          orderBy: { completedAt: 'desc' },
          take: 1,
        },
      },
    });

    // Fetch client user records
    const users = await prisma.user.findMany({
      where: { id: { in: pagedIds } },
      select: { id: true, name: true, email: true, phone: true, photoUrl: true, memberNumber: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const data = pagedIds.map((clientId) => {
      const clientPrograms = programs.filter((p) => p.clientId === clientId);
      const totalPrograms = clientPrograms.length;
      const activeProgramsCount = clientPrograms.filter(
        (p) => p.status === ProgramStatus.ACTIVE,
      ).length;

      // Last session: most recent log across all programs
      const lastSessionDate =
        clientPrograms
          .flatMap((p) => p.logs)
          .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())[0]
          ?.completedAt ?? null;

      // Compliance: last 30 days only
      const recentPrograms = clientPrograms.filter((p) => p.createdAt >= thirtyDaysAgo);
      const completedRecent = recentPrograms.filter(
        (p) => p.status === ProgramStatus.COMPLETED,
      ).length;
      const complianceRate =
        recentPrograms.length > 0
          ? Math.round((completedRecent / recentPrograms.length) * 100)
          : 0;

      return {
        ...userMap.get(clientId)!,
        totalPrograms,
        activeProgramsCount,
        lastSessionDate,
        complianceRate,
      };
    });

    return { data, total, page, limit };
  }

  async remove(id: string, organizationId: string): Promise<{ ok: boolean }> {
    await this.findOne(id, organizationId, undefined);
    await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }
}
