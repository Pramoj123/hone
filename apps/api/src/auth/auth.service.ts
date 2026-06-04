import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
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
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');

    const user = await this.users.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
      emailVerifyToken,
    });

    this.mail.sendEmailVerification(user.email, user.name, emailVerifyToken).catch(() => null);

    const tokens = this.issueTokens(user.id, user.email, user.role, null);
    await this.storeRefreshToken(user.id, tokens.refresh_token);
    return tokens;
  }

  // ── Flow 3: Token storage helpers ──────────────────────────────────────────

  private async storeRefreshToken(userId: string, rawToken: string): Promise<void> {
    const tokenHash = await bcrypt.hash(rawToken, 8); // cost 8 — fast, not password
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
    // Prune old expired tokens for this user (keep last 5 active)
    const tokens = await prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (tokens.length > 5) {
      const toRevoke = tokens.slice(5).map((t) => t.id);
      await prisma.refreshToken.updateMany({ where: { id: { in: toRevoke } }, data: { revokedAt: new Date() } });
    }
  }

  async logout(rawRefreshToken: string): Promise<{ ok: boolean }> {
    // Find the token record by comparing bcrypt hashes
    const tokens = await prisma.refreshToken.findMany({
      where: { revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, tokenHash: true },
      take: 50, // safety limit
    });
    for (const record of tokens) {
      const match = await bcrypt.compare(rawRefreshToken, record.tokenHash);
      if (match) {
        await prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
        return { ok: true };
      }
    }
    return { ok: true }; // silent if not found — idempotent
  }

  async validateRefreshToken(rawRefreshToken: string, userId: string): Promise<boolean> {
    const tokens = await prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, tokenHash: true },
    });
    for (const record of tokens) {
      const match = await bcrypt.compare(rawRefreshToken, record.tokenHash);
      if (match) {
        // Rotate — revoke old token
        await prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
        return true;
      }
    }
    return false;
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

    const tokens = this.issueTokens(user.id, user.email, user.role, gymSlug);
    await this.storeRefreshToken(user.id, tokens.refresh_token);
    return tokens;
  }

  async refresh(userId: string, email: string, role: string, gymSlug: string | null = null, rawRefreshToken?: string): Promise<AuthTokens> {
    // Validate the incoming refresh token against DB and rotate it
    if (rawRefreshToken) {
      const valid = await this.validateRefreshToken(rawRefreshToken, userId);
      if (!valid) throw new UnauthorizedException('Refresh token is invalid or revoked');
    }
    const tokens = this.issueTokens(userId, email, role, gymSlug);
    await this.storeRefreshToken(userId, tokens.refresh_token);
    return tokens;
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
        emailVerifiedAt: true,
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

  // ── Flow 4: Accept invite (staff or member) ────────────────────────────────

  async acceptInvite(token: string, newPassword: string): Promise<{ access_token: string; refresh_token: string }> {
    const user = await prisma.user.findUnique({ where: { passwordResetToken: token } });

    if (
      !user ||
      user.deletedAt ||
      !user.passwordResetExpiry ||
      user.passwordResetExpiry < new Date()
    ) {
      throw new BadRequestException('Invite link is invalid or has expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
        emailVerifiedAt: new Date(), // auto-verify on invite accept
      },
    });

    let gymSlug: string | null = null;
    if (user.organizationId) {
      const org = await prisma.organization.findUnique({ where: { id: user.organizationId } });
      gymSlug = org?.slug ?? null;
    } else if (user.branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: user.branchId },
        select: { organization: { select: { slug: true } } },
      });
      gymSlug = branch?.organization?.slug ?? null;
    }

    const tokens = this.issueTokens(user.id, user.email, user.role, gymSlug);
    await this.storeRefreshToken(user.id, tokens.refresh_token);
    return tokens;
  }

  // ── Flow 2: Email verification ─────────────────────────────────────────────

  async verifyEmail(token: string): Promise<{ ok: boolean }> {
    const user = await prisma.user.findUnique({ where: { emailVerifyToken: token } });
    if (!user || user.deletedAt) throw new BadRequestException('Invalid or expired verification link');

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date(), emailVerifyToken: null },
    });
    return { ok: true };
  }

  async resendVerification(userId: string): Promise<{ ok: boolean }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.emailVerifiedAt) return { ok: true }; // already verified or not found — silent

    const emailVerifyToken = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({ where: { id: userId }, data: { emailVerifyToken } });
    await this.mail.sendEmailVerification(user.email, user.name ?? user.email, emailVerifyToken);
    return { ok: true };
  }

  // ── Flow 1: Forgot / Reset password ────────────────────────────────────────

  async forgotPassword(email: string): Promise<{ ok: boolean }> {
    const user = await prisma.user.findUnique({ where: { email } });
    // Always return ok to avoid email enumeration
    if (!user || user.deletedAt) return { ok: true };

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: rawToken, passwordResetExpiry: expiry },
    });

    await this.mail.sendPasswordReset(user.email, user.name ?? user.email, rawToken);
    return { ok: true };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ ok: boolean }> {
    const user = await prisma.user.findUnique({
      where: { passwordResetToken: token },
    });

    if (
      !user ||
      user.deletedAt ||
      !user.passwordResetExpiry ||
      user.passwordResetExpiry < new Date()
    ) {
      throw new BadRequestException('Reset link is invalid or has expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

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
