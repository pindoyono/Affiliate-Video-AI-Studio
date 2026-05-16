import { Controller, Post, Get, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { PublishService } from './publish.service';
import { SchedulePublishDto } from './publish.dto';
import { successResponse, errorResponse } from '../common/response.helper';

@ApiTags('publish')
@Controller('publish')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PublishController {
  constructor(private readonly publishService: PublishService) {}

  @Post('schedule')
  @ApiOperation({ summary: 'Schedule a video for publishing to a social platform' })
  async schedule(@Body() dto: SchedulePublishDto, @Request() req: any) {
    try {
      const data = await this.publishService.schedule(dto, req.user.userId);
      return successResponse(data, 'Publish job scheduled');
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get('jobs')
  @ApiOperation({ summary: 'List all publish jobs for the current user' })
  async getJobs(@Request() req: any) {
    try {
      const data = await this.publishService.getJobs(req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get details of a specific publish job' })
  @ApiParam({ name: 'id', description: 'Publish job UUID' })
  async getJob(@Param('id') id: string, @Request() req: any) {
    try {
      const data = await this.publishService.getJob(id, req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }
}
