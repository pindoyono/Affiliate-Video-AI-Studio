import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { AiContentService } from './ai-content.service';
import { GenerateContentDto } from './ai-content.dto';
import { successResponse, errorResponse } from '../common/response.helper';

@ApiTags('ai-content')
@Controller('ai-content')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class AiContentController {
  constructor(private aiContentService: AiContentService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate AI content for a video' })
  async generateContent(@Body() dto: GenerateContentDto, @Request() req: any) {
    try {
      const data = await this.aiContentService.generateContent(dto, req.user.userId);
      return successResponse(data, 'Content generated successfully');
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get(':videoId')
  @ApiOperation({ summary: 'Get AI content for a video' })
  async getContent(@Param('videoId') videoId: string) {
    try {
      return successResponse({ videoId, message: 'Content retrieval not yet implemented' });
    } catch (err) {
      return errorResponse(err.message);
    }
  }
}
