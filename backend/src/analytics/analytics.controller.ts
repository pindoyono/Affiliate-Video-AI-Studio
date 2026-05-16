import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { TrackEventDto } from './analytics.dto';
import { successResponse, errorResponse } from '../common/response.helper';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Post('track')
  @ApiOperation({ summary: 'Record an analytics event for a video' })
  async track(@Body() dto: TrackEventDto, @Request() req: any) {
    try {
      const data = await this.analyticsService.trackEvent(dto, req.user.userId);
      return successResponse(data, 'Event tracked');
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get analytics dashboard for all videos' })
  async getDashboard(@Request() req: any) {
    try {
      const data = await this.analyticsService.getDashboard(req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get('video/:id')
  @ApiOperation({ summary: 'Get analytics for a specific video' })
  @ApiParam({ name: 'id', description: 'Video UUID' })
  async getVideoAnalytics(@Param('id') id: string, @Request() req: any) {
    try {
      const data = await this.analyticsService.getVideoAnalytics(id, req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue breakdown across all videos' })
  async getRevenue(@Request() req: any) {
    try {
      const data = await this.analyticsService.getRevenue(req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }
}
