import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as axios from 'axios';

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = configService.get<string>('OLLAMA_BASE_URL', 'http://localhost:11434');
    this.model = configService.get<string>('OLLAMA_MODEL', 'deepseek-r1:7b');
  }

  async generate(prompt: string, system?: string): Promise<string> {
    try {
      const response = await (axios as any).default.post(
        `${this.baseUrl}/api/generate`,
        {
          model: this.model,
          prompt,
          system: system || 'You are an expert affiliate marketing video content creator.',
          stream: false,
        },
        { timeout: 60000 },
      );
      return response.data.response;
    } catch (err) {
      this.logger.warn(`Ollama failed: ${err.message}`);
      throw err;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await (axios as any).default.get(`${this.baseUrl}/api/tags`, { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }
}
