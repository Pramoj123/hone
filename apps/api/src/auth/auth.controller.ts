import { Controller, Post, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser, type CurrentUserType } from '../common/decorators/current-user.decorator';

class UpdateMeDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() phone?: string;
}

class UpdatePasswordDto {
  @IsString() @MinLength(1) currentPassword!: string;
  @IsString() @MinLength(8) newPassword!: string;
}

interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthTokens> {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto): Promise<AuthTokens> {
    return this.auth.login(dto);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  refresh(@CurrentUser() user: CurrentUserType): AuthTokens {
    return this.auth.refresh(user.id, user.email, String(user.role));
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: CurrentUserType): CurrentUserType {
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@CurrentUser() user: CurrentUserType, @Body() dto: UpdateMeDto) {
    return this.auth.updateMe(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/password')
  updatePassword(@CurrentUser() user: CurrentUserType, @Body() dto: UpdatePasswordDto) {
    return this.auth.updatePassword(user.id, dto.currentPassword, dto.newPassword);
  }
}
