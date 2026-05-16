import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { TrendsModule } from './trends/trends.module';
import { AiContentModule } from './ai-content/ai-content.module';
import { PresentersModule } from './presenters/presenters.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { VideosModule } from './videos/videos.module';
import { WorkersModule } from './workers/workers.module';
import { RenderModule } from './render/render.module';
import { StorageModule } from './storage/storage.module';
import { AffiliateModule } from './affiliate/affiliate.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    AuthModule,
    ProductsModule,
    TrendsModule,
    AiContentModule,
    PresentersModule,
    KnowledgeModule,
    VideosModule,
    WorkersModule,
    RenderModule,
    StorageModule,
    AffiliateModule,
  ],
})
export class AppModule {}
