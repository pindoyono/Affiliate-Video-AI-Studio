import { Controller, Get, Post, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { TrendsService } from './trends.service';
import { successResponse, errorResponse } from '../common/response.helper';

@ApiTags('trends')
@Controller('trends')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class TrendsController {
  constructor(private trendsService: TrendsService) {}

  @Get()
  @ApiOperation({ summary: 'Get trends dashboard' })
  async getDashboard(@Request() req: any) {
    try {
      const data = await this.trendsService.getDashboard(req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get(':productId')
  @ApiOperation({ summary: 'Get trends for a product' })
  async getTrendsByProduct(@Param('productId') productId: string, @Request() req: any) {
    try {
      const data = await this.trendsService.getTrendsByProduct(productId, req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Post('analyze/:productId')
  @ApiOperation({ summary: 'Analyze trends for a product' })
  async analyzeProduct(@Param('productId') productId: string, @Request() req: any) {
    try {
      const data = await this.trendsService.analyzeProduct(productId, req.user.userId);
      return successResponse(data, 'Trend analysis complete');
    } catch (err) {
      return errorResponse(err.message);
    }
  }
}
