import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { OllamaService } from './ollama.service';
import { GenerateContentDto } from './ai-content.dto';

@Injectable()
export class AiContentService {
  private readonly logger = new Logger(AiContentService.name);
  private openai: OpenAI;

  constructor(
    private prisma: PrismaService,
    private ollamaService: OllamaService,
    private configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: configService.get<string>('OPENAI_API_KEY', 'placeholder'),
    });
  }

  async generateContent(dto: GenerateContentDto, userId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, userId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const title = await this.generateTitle(product.title, product.description || '');
    const hook = await this.generateHook(product.title, product.description || '');
    const script = await this.generateScript(product);
    const storyboard = await this.generateStoryboard(script);
    const scenePrompts = await this.generateScenePrompts(storyboard, dto.mode);
    const cta = await this.generateCTA(product.title, product.affiliateUrl || '');

    return { title, hook, script, storyboard, scenePrompts, cta };
  }

  async generateTitle(productTitle: string, description: string): Promise<string> {
    const prompt = `Create a compelling, viral video title for this affiliate product:
Product: ${productTitle}
Description: ${description}
Output only the title, max 60 characters.`;
    return this.callAI(prompt);
  }

  async generateHook(productTitle: string, description: string): Promise<string> {
    const prompt = `Create a powerful 3-second hook for a TikTok/Reels video about:
Product: ${productTitle}
Description: ${description}
Output only the hook sentence (max 15 words), designed to stop scrolling.`;
    return this.callAI(prompt);
  }

  async generateScript(product: any): Promise<string> {
    const prompt = `Write a 60-second video script for an affiliate marketing video:
Product: ${product.title}
Description: ${product.description || 'N/A'}
Price: ${product.price || 'N/A'}
Rating: ${product.rating || 'N/A'}

Structure: Hook (5s) -> Problem (10s) -> Solution/Product (25s) -> Social Proof (10s) -> CTA (10s)
Keep it conversational and persuasive.`;
    return this.callAI(prompt);
  }

  async generateStoryboard(script: string): Promise<string[]> {
    const prompt = `Convert this video script into 5-7 visual scene descriptions for a storyboard:
Script: ${script}

Output as JSON array of scene descriptions (strings only).`;
    try {
      const result = await this.callAI(prompt);
      const cleaned = result.replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return script.split('\n').filter(line => line.trim()).slice(0, 6);
    }
  }

  async generateScenePrompts(scenes: string[], mode: string): Promise<string[]> {
    return scenes.map((scene, i) => {
      const style = mode === 'FACELESS' ? 'product showcase, no people' : 'person presenting product';
      return `${scene} | Style: ${style}, cinematic, high quality, 9:16 vertical video frame`;
    });
  }

  async generateCTA(productTitle: string, affiliateUrl: string): Promise<string> {
    const prompt = `Write a compelling call-to-action for "${productTitle}".
Link available: ${affiliateUrl ? 'Yes' : 'No'}
Max 20 words. Action-oriented.`;
    return this.callAI(prompt);
  }

  private async callAI(prompt: string): Promise<string> {
    const ollamaAvailable = await this.ollamaService.isAvailable();
    if (ollamaAvailable) {
      try {
        return await this.ollamaService.generate(prompt);
      } catch (err) {
        this.logger.warn('Ollama failed, falling back to OpenAI');
      }
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
      });
      return response.choices[0]?.message?.content || '';
    } catch (err) {
      this.logger.error(`OpenAI fallback failed: ${err.message}`);
      return `[AI content for: ${prompt.slice(0, 50)}...]`;
    }
  }
}
