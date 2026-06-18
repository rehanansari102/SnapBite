import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { R2Service } from './r2.service';

@Module({
  controllers: [MediaController],
  providers: [R2Service, MediaService],
  exports: [R2Service],
})
export class MediaModule {}
