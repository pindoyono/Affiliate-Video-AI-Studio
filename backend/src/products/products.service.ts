import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import * as axios from 'axios';
import * as cheerio from 'cheerio';
import { PrismaService } from '../prisma/prisma.service';
import { ImportProductDto } from './products.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('product-import') private productQueue: Queue,
  ) {}

  async importProduct(dto: ImportProductDto, userId: string) {
    const sourceType = dto.sourceType || this.detectSourceType(dto.url);
    const product = await this.prisma.product.create({
      data: {
        userId,
        title: 'Importing...',
        sourceUrl: dto.url,
        sourceType: sourceType as any,
        status: 'PENDING',
      },
    });

    await this.productQueue.add('import', { productId: product.id, url: dto.url, sourceType, userId });
    return product;
  }

  async getProducts(userId: string) {
    return this.prisma.product.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { trendAnalyses: { orderBy: { analyzedAt: 'desc' }, take: 1 } },
    });
  }

  async getProduct(id: string, userId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, userId },
      include: { trendAnalyses: true, videos: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async getTrending(userId: string) {
    return this.prisma.product.findMany({
      where: { userId, trendScore: { gt: 0 } },
      orderBy: { trendScore: 'desc' },
      take: 20,
      include: { trendAnalyses: { orderBy: { analyzedAt: 'desc' }, take: 1 } },
    });
  }

  async scrapeShopee(url: string): Promise<Partial<any>> {
    try {
      const response = await (axios as any).default.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10000,
      });
      const $ = cheerio.load(response.data);

      const title = $('h1').first().text().trim() || $('[class*="title"]').first().text().trim();
      const priceText = $('[class*="price"]').first().text().trim();
      const price = parseFloat(priceText.replace(/[^\d.]/g, '')) || 0;
      const ratingText = $('[class*="rating"]').first().text().trim();
      const rating = parseFloat(ratingText) || 0;
      const soldText = $('[class*="sold"]').first().text().trim();
      const soldCount = parseInt(soldText.replace(/[^\d]/g, '')) || 0;

      const images: string[] = [];
      $('img[src*="shopee"]').each((_, el) => {
        const src = $(el).attr('src');
        if (src) images.push(src);
      });

      return { title: title || 'Shopee Product', price, rating, soldCount, images: images.slice(0, 5) };
    } catch (err) {
      this.logger.error(`Shopee scrape failed: ${err.message}`);
      return { title: 'Shopee Product', price: 0, rating: 0, soldCount: 0, images: [] };
    }
  }

  async scrapeTikTok(url: string): Promise<Partial<any>> {
    try {
      const response = await (axios as any).default.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10000,
      });
      const $ = cheerio.load(response.data);

      const title = $('h1').first().text().trim() || $('[class*="title"]').first().text().trim();
      const priceText = $('[class*="price"]').first().text().trim();
      const price = parseFloat(priceText.replace(/[^\d.]/g, '')) || 0;

      const images: string[] = [];
      $('img').each((_, el) => {
        const src = $(el).attr('src');
        if (src && src.startsWith('http')) images.push(src);
      });

      return { title: title || 'TikTok Product', price, images: images.slice(0, 5) };
    } catch (err) {
      this.logger.error(`TikTok scrape failed: ${err.message}`);
      return { title: 'TikTok Product', price: 0, images: [] };
    }
  }

  private detectSourceType(url: string): string {
    if (url.includes('shopee')) return 'SHOPEE';
    if (url.includes('tiktok')) return 'TIKTOK';
    return 'MANUAL';
  }
}
