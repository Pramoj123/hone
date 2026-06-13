import { Module } from '@nestjs/common';
import { NimClientService } from './nim-client.service';
import { AiProgramsService } from './ai-programs.service';
import { AiProgramsController } from './ai-programs.controller';

@Module({
  controllers: [AiProgramsController],
  providers: [NimClientService, AiProgramsService],
})
export class AiModule {}
