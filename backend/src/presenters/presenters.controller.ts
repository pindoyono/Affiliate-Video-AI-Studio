import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { PresentersService } from './presenters.service';
import { CreatePresenterDto, UpdatePresenterDto } from './presenters.dto';
import { successResponse, errorResponse } from '../common/response.helper';

@ApiTags('presenters')
@Controller('presenters')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PresentersController {
  constructor(private presentersService: PresentersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a presenter' })
  async create(@Body() dto: CreatePresenterDto, @Request() req: any) {
    try {
      const data = await this.presentersService.create(dto, req.user.userId);
      return successResponse(data, 'Presenter created');
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all presenters' })
  async findAll(@Request() req: any) {
    try {
      const data = await this.presentersService.findAll(req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get presenter by ID' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    try {
      const data = await this.presentersService.findOne(id, req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update presenter' })
  async update(@Param('id') id: string, @Body() dto: UpdatePresenterDto, @Request() req: any) {
    try {
      const data = await this.presentersService.update(id, dto, req.user.userId);
      return successResponse(data, 'Presenter updated');
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete presenter' })
  async remove(@Param('id') id: string, @Request() req: any) {
    try {
      await this.presentersService.remove(id, req.user.userId);
      return successResponse(null, 'Presenter deleted');
    } catch (err) {
      return errorResponse(err.message);
    }
  }
}
