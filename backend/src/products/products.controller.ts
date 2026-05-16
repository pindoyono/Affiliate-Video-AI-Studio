import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { OpportunityService } from './opportunity.service';
import { ImportProductDto } from './products.dto';
import { successResponse, errorResponse } from '../common/response.helper';

@ApiTags('products')
@Controller('products')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ProductsController {
  constructor(
    private productsService: ProductsService,
    private opportunityService: OpportunityService,
  ) {}

  @Post('import')
  @ApiOperation({ summary: 'Import a product from URL' })
  async importProduct(@Body() dto: ImportProductDto, @Request() req: any) {
    try {
      const data = await this.productsService.importProduct(dto, req.user.userId);
      return successResponse(data, 'Product import queued');
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  async getProducts(@Request() req: any) {
    try {
      const data = await this.productsService.getProducts(req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending products' })
  async getTrending(@Request() req: any) {
    try {
      const data = await this.productsService.getTrending(req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get('opportunity')
  @ApiOperation({ summary: 'Get opportunity scores for all products' })
  async getOpportunities(@Request() req: any) {
    try {
      const data = await this.opportunityService.getOpportunities(req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get('opportunity/:id')
  @ApiOperation({ summary: 'Get opportunity score for a specific product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  async getOpportunityById(@Param('id') id: string, @Request() req: any) {
    try {
      const data = await this.opportunityService.getOpportunityById(id, req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  async getProduct(@Param('id') id: string, @Request() req: any) {
    try {
      const data = await this.productsService.getProduct(id, req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }
}
