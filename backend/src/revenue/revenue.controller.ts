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
import { RevenueService } from './revenue.service';
import { CreateRevenueReportDto } from './revenue.dto';
import { successResponse, errorResponse } from '../common/response.helper';

@ApiTags('revenue')
@Controller('revenue')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  @Post('report')
  @ApiOperation({ summary: 'Create a revenue report entry for a video' })
  async create(@Body() dto: CreateRevenueReportDto, @Request() req: any) {
    try {
      const data = await this.revenueService.create(dto, req.user.userId);
      return successResponse(data, 'Revenue report created');
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get revenue dashboard for the current user' })
  async getDashboard(@Request() req: any) {
    try {
      const data = await this.revenueService.getDashboard(req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get('video/:id')
  @ApiOperation({ summary: 'Get revenue metrics for a specific video' })
  @ApiParam({ name: 'id', description: 'Video UUID' })
  async getVideoRevenue(@Param('id') id: string, @Request() req: any) {
    try {
      const data = await this.revenueService.getVideoRevenue(id, req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get('report')
  @ApiOperation({ summary: 'Get full list of revenue report records for the current user' })
  async getReport(@Request() req: any) {
    try {
      const data = await this.revenueService.getReport(req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }
}
