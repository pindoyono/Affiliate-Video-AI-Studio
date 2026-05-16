import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { VideosService } from './videos.service';
import { CreateVideoDto } from './videos.dto';
import { successResponse, errorResponse } from '../common/response.helper';

@ApiTags('videos')
@Controller('videos')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class VideosController {
  constructor(private videosService: VideosService) {}

  @Post()
  @ApiOperation({ summary: 'Create a video project' })
  async create(@Body() dto: CreateVideoDto, @Request() req: any) {
    try {
      const data = await this.videosService.createVideo(dto, req.user.userId);
      return successResponse(data, 'Video project created');
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all videos' })
  async findAll(@Request() req: any) {
    try {
      const data = await this.videosService.getVideos(req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get video by ID' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    try {
      const data = await this.videosService.getVideo(id, req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Post(':id/render')
  @ApiOperation({ summary: 'Start video rendering' })
  async startRender(@Param('id') id: string, @Request() req: any) {
    try {
      const data = await this.videosService.startRender(id, req.user.userId);
      return successResponse(data, 'Render started');
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get video render status' })
  async getStatus(@Param('id') id: string, @Request() req: any) {
    try {
      const data = await this.videosService.getStatus(id, req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }
}
