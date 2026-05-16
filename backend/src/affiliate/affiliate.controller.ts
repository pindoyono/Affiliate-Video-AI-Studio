import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { AffiliateService } from './affiliate.service';
import { GenerateAffiliateDto } from './affiliate.dto';
import { successResponse, errorResponse } from '../common/response.helper';

@ApiTags('affiliate')
@Controller('affiliate')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class AffiliateController {
  constructor(private readonly affiliateService: AffiliateService) {}

  @Get('product/:id')
  @ApiOperation({ summary: 'Get affiliate data for a product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  async getByProduct(@Param('id') id: string, @Request() req: any) {
    try {
      const data = await this.affiliateService.getByProductId(id, req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate or refresh affiliate data for a product' })
  async generate(@Body() dto: GenerateAffiliateDto, @Request() req: any) {
    try {
      const data = await this.affiliateService.generate(dto, req.user.userId);
      return successResponse(data, 'Affiliate data generated');
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get aggregated affiliate metrics for the current user' })
  async getMetrics(@Request() req: any) {
    try {
      const data = await this.affiliateService.getMetrics(req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }
}
