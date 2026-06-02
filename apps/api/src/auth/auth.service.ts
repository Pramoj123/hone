import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { prisma } from '@hone/database';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private jwt: JwtService,
    private mail: MailService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.users.create({ email: dto.email, passwordHash, name: dto.name });

    this.mail.sendWelcome(user.email, user.name).catch(() => null);

    return this.issueTokens(user.id, user.email, user.role, null);
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.users.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    let gymSlug: string | null = null;
    if (user.organizationId) {
      // ORG_ADMIN: directly linked to org
      const org = await prisma.organization.findUnique({ where: { id: user.organizationId } });
      gymSlug = org?.slug ?? null;
    } else if (user.branchId) {
      // TRAINER / BRANCH_MANAGER / CLIENT: linked to org through branch
      const branch = await prisma.branch.findUnique({
        where: { id: user.branchId },
        select: { organization: { select: { slug: true } } },
      });
      gymSlug = branch?.organization?.slug ?? null;
    }

    return this.issueTokens(user.id, user.email, user.role, gymSlug);
  }

  refresh(userId: string, email: string, role: string, gymSlug: string | null = null): AuthTokens {
    return this.issueTokens(userId, email, role, gymSlug);
  }

  async getMe(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        dateOfBirth: true,
        gender: true,
        memberNumber: true,
        fitnessGoals: true,
        referredBy: true,
        organizationId: true,
        branchId: true,
        createdAt: true,
        updatedAt: true,
        memberProfile: {
          select: {
            height: true,
            weight: true,
            bloodType: true,
            fitnessLevel: true,
            primaryGoal: true,
            medicalConditions: true,
            allergies: true,
            currentMedications: true,
            pastInjuries: true,
            physicianName: true,
            physicianPhone: true,
            hasSignedWaiver: true,
            waiverSignedAt: true,
          },
        },
      },
    });
  }

  async updateMe(userId: string, dto: { name?: string; phone?: string; dateOfBirth?: string; gender?: string; fitnessGoals?: string }) {
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.phone !== undefined) data.phone = dto.phone || null;
    if (dto.dateOfBirth !== undefined) data.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    if (dto.gender !== undefined) data.gender = dto.gender || null;
    if (dto.fitnessGoals !== undefined) data.fitnessGoals = dto.fitnessGoals || null;
    return prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, email: true, phone: true, dateOfBirth: true, gender: true, fitnessGoals: true, role: true },
    });
  }

  async updateHealthProfile(userId: string, dto: {
    height?: number;
    weight?: number;
    bloodType?: string;
    fitnessLevel?: string;
    primaryGoal?: string;
    medicalConditions?: string[];
    allergies?: string[];
    currentMedications?: string;
    pastInjuries?: string;
    physicianName?: string;
    physicianPhone?: string;
  }) {
    const data: Record<string, unknown> = {};
    if (dto.height !== undefined) data.height = dto.height || null;
    if (dto.weight !== undefined) data.weight = dto.weight || null;
    if (dto.bloodType !== undefined) data.bloodType = dto.bloodType || null;
    if (dto.fitnessLevel !== undefined) data.fitnessLevel = dto.fitnessLevel || null;
    if (dto.primaryGoal !== undefined) data.primaryGoal = dto.primaryGoal || null;
    if (dto.medicalConditions !== undefined) data.medicalConditions = dto.medicalConditions;
    if (dto.allergies !== undefined) data.allergies = dto.allergies;
    if (dto.currentMedications !== undefined) data.currentMedications = dto.currentMedications || null;
    if (dto.pastInjuries !== undefined) data.pastInjuries = dto.pastInjuries || null;
    if (dto.physicianName !== undefined) data.physicianName = dto.physicianName || null;
    if (dto.physicianPhone !== undefined) data.physicianPhone = dto.physicianPhone || null;

    return prisma.memberProfile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  async updatePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    this.mail.sendPasswordChanged(user.email, user.name ?? user.email).catch(() => null);

    return { ok: true };
  }

  private issueTokens(sub: string, email: string, role: string, gymSlug: string | null): AuthTokens {
    const payload = { sub, email, role, gymSlug };

    const access_token = this.jwt.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: (process.env.JWT_EXPIRES_IN ?? '15m') as never,
    });

    const refresh_token = this.jwt.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as never,
    });

    return { access_token, refresh_token };
  }
}
