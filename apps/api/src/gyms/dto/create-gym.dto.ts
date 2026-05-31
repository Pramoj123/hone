import {
  IsEmail,
  IsHexColor,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateGymDto {
  // ── Basics ────────────────────────────────────────────────────────────────
  @IsString()
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug may only contain lowercase letters, numbers, and hyphens',
  })
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  // ── Location ──────────────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  // ── Contact ───────────────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  publicEmail?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  // ── Operational ───────────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  openingHours?: string;

  // ── Branding ──────────────────────────────────────────────────────────────
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  // ── Org admin account ─────────────────────────────────────────────────────
  @IsString()
  orgAdminName!: string;

  @IsEmail()
  orgAdminEmail!: string;

  @IsString()
  @MinLength(8)
  orgAdminPassword!: string;
}
