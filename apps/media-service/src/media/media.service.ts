import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { R2Service } from './r2.service';
import { PresignedUrlDto } from './dto/presigned-url.dto';

@Injectable()
export class MediaService {
  private readonly expiresIn: number;
  private readonly publicBaseUrl: string;

  constructor(
    private readonly r2: R2Service,
    private readonly config: ConfigService,
  ) {
    this.expiresIn = Number(config.get('PRESIGNED_URL_EXPIRES', 300));
    this.publicBaseUrl = config.getOrThrow('MEDIA_PUBLIC_BASE_URL');
  }

  async getPresignedUrl(dto: PresignedUrlDto): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
    const ext = dto.fileName.split('.').pop() ?? 'jpg';
    const key = `${dto.folder}/${crypto.randomUUID()}.${ext}`;

    const uploadUrl = await this.r2.generatePresignedUploadUrl(key, dto.contentType, this.expiresIn);
    // publicBaseUrl is the R2 public bucket URL (e.g. https://pub-xxx.r2.dev)
    const publicUrl = `${this.publicBaseUrl}/${key}`;

    return { uploadUrl, publicUrl, key };
  }

  async deleteFile(key: string): Promise<void> {
    await this.r2.delete(key);
  }
}
