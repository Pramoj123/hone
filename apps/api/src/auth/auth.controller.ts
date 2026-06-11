import { Controller, Post, Get, Patch, Body, UseGuards, Query, Logger } from '@nestjs/common';
import { IsOptional, IsString, IsArray, IsNumber, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser, type CurrentUserType } from '../common/decorators/current-user.decorator';

class UpdateMeDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() dateOfBirth?: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() fitnessGoals?: string;
}

class UpdateHealthProfileDto {
  @IsOptional() @IsNumber() @Type(() => Number) height?: number;
  @IsOptional() @IsNumber() @Type(() => Number) weight?: number;
  @IsOptional() @IsString() bloodType?: string;
  @IsOptional() @IsString() fitnessLevel?: string;
  @IsOptional() @IsString() primaryGoal?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) medicalConditions?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) allergies?: string[];
  @IsOptional() @IsString() currentMedications?: string;
  @IsOptional() @IsString() pastInjuries?: string;
  @IsOptional() @IsString() physicianName?: string;
  @IsOptional() @IsString() physicianPhone?: string;
}

class UpdatePasswordDto {
  @IsString() @MinLength(1) currentPassword!: string;
  @IsString() @MinLength(8) newPassword!: string;
}

class ForgotPasswordDto {
  @IsString() email!: string;
}

class ResetPasswordDto {
  @IsString() token!: string;
  @IsString() @MinLength(8) newPassword!: string;
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto): Promise<{ access_token: string; refresh_token: string }> {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto): Promise<{ access_token: string; refresh_token: string }> {
    return this.auth.login(dto);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  async refresh(@CurrentUser() user: CurrentUserType, @Body('refresh_token') rawToken?: string): Promise<{ access_token: string; refresh_token: string }> {
    return this.auth.refresh(user.id, user.email, String(user.role), rawToken);
  }

  // ── Flow 3: Logout (revoke refresh token) ──────────────────────────────────
  @Post('logout')
  logout(@Body('refresh_token') rawToken?: string) {
    if (!rawToken) return { ok: true };
    return this.auth.logout(rawToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: CurrentUserType) {
    return this.auth.getMe(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@CurrentUser() user: CurrentUserType, @Body() dto: UpdateMeDto) {
    return this.auth.updateMe(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/health-profile')
  updateHealthProfile(@CurrentUser() user: CurrentUserType, @Body() dto: UpdateHealthProfileDto) {
    return this.auth.updateHealthProfile(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/password')
  updatePassword(@CurrentUser() user: CurrentUserType, @Body() dto: UpdatePasswordDto) {
    return this.auth.updatePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  // ── Flow 1: Forgot / Reset password ────────────────────────────────────────

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.newPassword);
  }

  // ── Flow 4: Accept invite ──────────────────────────────────────────────────

  @Post('accept-invite')
  async acceptInvite(@Body() dto: ResetPasswordDto): Promise<{ access_token: string; refresh_token: string }> {
    return this.auth.acceptInvite(dto.token, dto.newPassword);
  }

  // ── Flow 2: Email verification ─────────────────────────────────────────────

  @Get('verify-email')
  verifyEmail(@Query('token') token: string) {
    this.logger.log(`GET /auth/verify-email — token present: ${!!token}, length: ${token?.length ?? 0}`);
    return this.auth.verifyEmail(token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('resend-verification')
  resendVerification(@CurrentUser() user: CurrentUserType) {
    return this.auth.resendVerification(user.id);
  }
}
