import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { AiCostService } from './ai-cost.service';
import { TrackAiUsageDto } from './ai-cost.dto';
import { successResponse, errorResponse } from '../common/response.helper';

@ApiTags('cost')
@Controller('cost')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class AiCostController {
  constructor(private readonly aiCostService: AiCostService) {}

  @Post('track')
  @ApiOperation({ summary: 'Record an AI usage event for cost tracking' })
  async track(@Body() dto: TrackAiUsageDto, @Request() req: any) {
    try {
      const data = await this.aiCostService.track(dto, req.user.userId);
      return successResponse(data, 'AI usage tracked');
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get AI cost dashboard for the current user' })
  async getDashboard(@Request() req: any) {
    try {
      const data = await this.aiCostService.getDashboard(req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get('project/:id')
  @ApiOperation({ summary: 'Get AI cost breakdown for a specific project' })
  @ApiParam({ name: 'id', description: 'Project ID (video / product UUID)' })
  async getProjectCost(@Param('id') id: string) {
    try {
      const data = await this.aiCostService.getProjectCost(id);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get('user/:id')
  @ApiOperation({ summary: 'Get AI cost breakdown for a specific user (self only)' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async getUserCost(@Param('id') id: string, @Request() req: any) {
    try {
      if (id !== req.user.userId) {
        throw new ForbiddenException('You can only view your own cost data');
      }
      const data = await this.aiCostService.getUserCost(id);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }
}
