import { IsString, IsOptional, IsNumber, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TrackAiUsageDto {
  @ApiProperty({ description: 'Service name (e.g. chat-completion, tts, image-generation)' })
  @IsString()
  service: string;

  @ApiProperty({ description: 'AI provider name (e.g. OpenAI, DeepSeek, Gemini, Claude)' })
  @IsString()
  provider: string;

  @ApiProperty({ description: 'Total tokens consumed', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  tokens?: number;

  @ApiProperty({ description: 'Prompt (input) tokens', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  promptTokens?: number;

  @ApiProperty({ description: 'Completion (output) tokens', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  completionTokens?: number;

  @ApiProperty({ description: 'Pre-computed cost estimate in USD', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedCost?: number;

  @ApiProperty({
    description: 'Request type: LLM | TTS | IMAGE | VIDEO',
    example: 'LLM',
    required: false,
  })
  @IsOptional()
  @IsString()
  requestType?: string;

  @ApiProperty({ description: 'Contextual project ID (e.g. video/product UUID)', required: false })
  @IsOptional()
  @IsString()
  projectId?: string;
}
