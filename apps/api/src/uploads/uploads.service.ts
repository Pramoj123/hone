import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface PresignResult {
  uploadUrl: string;
  fileUrl: string;
  key: string;
}

@Injectable()
export class UploadsService {
  async presign(filename: string, contentType: string): Promise<PresignResult> {
    const region = process.env.AWS_REGION;
    const bucket = process.env.AWS_S3_BUCKET;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!region || !bucket || !accessKeyId || !secretAccessKey) {
      throw new InternalServerErrorException(
        'Missing required AWS env vars: AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY',
      );
    }

    const s3 = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });

    const sanitized = filename.replace(/[^a-z0-9._-]/gi, '_');
    const key = `uploads/${Date.now()}-${sanitized}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    const fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    return { uploadUrl, fileUrl, key };
  }
}
