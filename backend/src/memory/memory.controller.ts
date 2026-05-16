import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { MemoryService } from './memory.service';
import { UpsertMemoryDto } from './memory.dto';
import { successResponse, errorResponse } from '../common/response.helper';

@ApiTags('memory')
@Controller('memory')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve the current user AI preferences' })
  async get(@Request() req: any) {
    try {
      const data = await this.memoryService.get(req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create or update user AI preferences' })
  async upsert(@Body() dto: UpsertMemoryDto, @Request() req: any) {
    try {
      const data = await this.memoryService.upsert(dto, req.user.userId);
      return successResponse(data, 'Preferences saved');
    } catch (err) {
      return errorResponse(err.message);
    }
  }
}
