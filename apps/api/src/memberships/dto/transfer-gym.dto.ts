import { IsString } from 'class-validator';

export class TransferGymDto {
  @IsString()
  slug!: string;
}
