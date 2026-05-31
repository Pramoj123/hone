import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { prisma } from '@hone/database';
import { UsersService } from '../users/users.service';
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
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.users.create({ email: dto.email, passwordHash, name: dto.name });

    return this.issueTokens(user.id, user.email, user.role, null);
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.users.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    let gymSlug: string | null = null;
    if (user.organizationId) {
      const org = await prisma.organization.findUnique({ where: { id: user.organizationId } });
      gymSlug = org?.slug ?? null;
    }

    return this.issueTokens(user.id, user.email, user.role, gymSlug);
  }

  refresh(userId: string, email: string, role: string, gymSlug: string | null = null): AuthTokens {
    return this.issueTokens(userId, email, role, gymSlug);
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
