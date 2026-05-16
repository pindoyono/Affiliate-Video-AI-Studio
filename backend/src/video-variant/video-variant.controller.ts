import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { VideoVariantService } from './video-variant.service';
import { GenerateVariantsDto } from './video-variant.dto';
import { SelectVariantDto } from './video-variant.dto';
import { successResponse, errorResponse } from '../common/response.helper';

@ApiTags('video-variant')
@Controller('video/variant')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class VideoVariantController {
  constructor(private videoVariantService: VideoVariantService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate AI-powered hooks, titles, and thumbnails for a video' })
  async generate(@Body() dto: GenerateVariantsDto, @Request() req: any) {
    try {
      const data = await this.videoVariantService.generateVariants(dto, req.user.userId);
      return successResponse(data, 'Variants generated');
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific video variant' })
  @ApiParam({ name: 'id', description: 'VideoVariant UUID' })
  async getVariant(@Param('id') id: string, @Request() req: any) {
    try {
      const data = await this.videoVariantService.getVariant(id, req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Post('select')
  @ApiOperation({ summary: 'Select a variant as the active one for its video' })
  async selectVariant(@Body() dto: SelectVariantDto, @Request() req: any) {
    try {
      const data = await this.videoVariantService.selectVariant(dto, req.user.userId);
      return successResponse(data, 'Variant selected');
    } catch (err) {
      return errorResponse(err.message);
    }
  }
}
