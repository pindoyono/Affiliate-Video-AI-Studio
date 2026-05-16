import { Module } from '@nestjs/common';
import { RenderService } from './render.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [RenderService],
  exports: [RenderService],
})
export class RenderModule {}
