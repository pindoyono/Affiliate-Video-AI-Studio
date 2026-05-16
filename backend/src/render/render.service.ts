import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ffmpeg = require('fluent-ffmpeg');
import * as fs from 'fs';
import * as path from 'path';
import { StorageService } from '../storage/storage.service';

export interface RenderJob {
  videoId: string;
  scenes: Array<{
    imageUrl?: string;
    audioUrl?: string;
    text?: string;
    duration: number;
  }>;
  outputPath: string;
  width?: number;
  height?: number;
}

@Injectable()
export class RenderService {
  private readonly logger = new Logger(RenderService.name);
  private readonly outputDir: string;

  constructor(
    private configService: ConfigService,
    private storageService: StorageService,
  ) {
    this.outputDir = configService.get<string>('RENDER_OUTPUT_DIR', '/tmp/renders');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async renderVideo(job: RenderJob): Promise<string> {
    const { videoId, scenes, width = 1080, height = 1920 } = job;
    const outputFile = path.join(this.outputDir, `${videoId}.mp4`);

    return new Promise((resolve, reject) => {
      const cmd = ffmpeg();

      // Build filter complex for all scenes
      let filterInputs = '';
      let sceneFilters: string[] = [];

      scenes.forEach((scene, i) => {
        if (scene.imageUrl && fs.existsSync(scene.imageUrl)) {
          cmd.input(scene.imageUrl);
          sceneFilters.push(`[${i}:v]scale=${width}:${height},setsar=1,fps=30,trim=duration=${scene.duration}[v${i}]`);
          filterInputs += `[v${i}]`;
        } else {
          // Generate blank frame for scenes without images
          cmd.input(`color=black:size=${width}x${height}:duration=${scene.duration}:rate=30`)
            .inputOptions(['-f', 'lavfi']);
          sceneFilters.push(`[${i}:v]setsar=1[v${i}]`);
          filterInputs += `[v${i}]`;
        }
      });

      const concatFilter = `${filterInputs}concat=n=${scenes.length}:v=1:a=0[outv]`;
      const fullFilter = [...sceneFilters, concatFilter].join(';');

      cmd
        .complexFilter(fullFilter)
        .outputOptions(['-map', '[outv]', '-c:v', 'libx264', '-preset', 'fast', '-crf', '23'])
        .output(outputFile)
        .on('end', () => {
          this.logger.log(`Render complete: ${outputFile}`);
          resolve(outputFile);
        })
        .on('error', (err) => {
          this.logger.error(`Render error: ${err.message}`);
          reject(err);
        })
        .run();
    });
  }

  async uploadRenderedVideo(videoId: string, filePath: string): Promise<string> {
    const buffer = fs.readFileSync(filePath);
    const key = this.storageService.buildKey('videos', `${videoId}.mp4`);
    await this.storageService.upload(key, buffer, 'video/mp4');
    fs.unlinkSync(filePath);
    return key;
  }

  async getVideoUrl(key: string): Promise<string> {
    return this.storageService.getSignedUrl(key);
  }
}
