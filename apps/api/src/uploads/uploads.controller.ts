import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { UploadsService, type PresignResult } from './uploads.service';
import { PresignDto } from './dto/presign.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('presign')
  presign(@Body() dto: PresignDto): Promise<PresignResult> {
    return this.uploads.presign(dto.filename, dto.contentType);
  }
}
