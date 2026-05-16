import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3: AWS.S3Client;
  private bucket: string;

  constructor(private configService: ConfigService) {
    this.bucket = configService.get<string>('S3_BUCKET', 'affiliate-studio');
    this.s3 = new AWS.S3Client({
      endpoint: configService.get<string>('S3_ENDPOINT', 'http://localhost:9000'),
      region: configService.get<string>('S3_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: configService.get<string>('S3_ACCESS_KEY', 'minioadmin'),
        secretAccessKey: configService.get<string>('S3_SECRET_KEY', 'minioadmin'),
      },
      forcePathStyle: true,
    });
  }

  async upload(filePath: string, buffer: Buffer, contentType = 'application/octet-stream') {
    const command = new AWS.PutObjectCommand({
      Bucket: this.bucket,
      Key: filePath,
      Body: buffer,
      ContentType: contentType,
    });
    await this.s3.send(command);
    return { key: filePath, bucket: this.bucket };
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new AWS.GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  async delete(key: string) {
    const command = new AWS.DeleteObjectCommand({ Bucket: this.bucket, Key: key });
    await this.s3.send(command);
  }

  buildKey(folder: string, filename: string): string {
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);
    return `${folder}/${base}-${Date.now()}${ext}`;
  }
}
