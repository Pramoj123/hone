import { IsString, Matches } from 'class-validator';

export class PresignDto {
  @IsString()
  filename!: string;

  @IsString()
  @Matches(/^(image|video|application)\/.+$/, {
    message: 'contentType must be a valid MIME type (image/*, video/*, application/*)',
  })
  contentType!: string;
}
