import { Controller, Post, Get, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { KnowledgeService } from './knowledge.service';
import { CreateKnowledgeDto, SearchKnowledgeDto } from './knowledge.dto';
import { successResponse, errorResponse } from '../common/response.helper';

@ApiTags('knowledge')
@Controller('knowledge')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class KnowledgeController {
  constructor(private knowledgeService: KnowledgeService) {}

  @Post()
  @ApiOperation({ summary: 'Add knowledge entry' })
  async create(@Body() dto: CreateKnowledgeDto, @Request() req: any) {
    try {
      const data = await this.knowledgeService.create(dto, req.user.userId);
      return successResponse(data, 'Knowledge entry created');
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get()
  @ApiOperation({ summary: 'List all knowledge entries' })
  async findAll(@Request() req: any) {
    try {
      const data = await this.knowledgeService.findAll(req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Post('search')
  @ApiOperation({ summary: 'Search knowledge (semantic)' })
  async search(@Body() dto: SearchKnowledgeDto, @Request() req: any) {
    try {
      const data = await this.knowledgeService.search(dto, req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get knowledge entry by ID' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    try {
      const data = await this.knowledgeService.findOne(id, req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete knowledge entry' })
  async remove(@Param('id') id: string, @Request() req: any) {
    try {
      await this.knowledgeService.remove(id, req.user.userId);
      return successResponse(null, 'Knowledge entry deleted');
    } catch (err) {
      return errorResponse(err.message);
    }
  }
}
