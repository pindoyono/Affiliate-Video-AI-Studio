import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { DispatchAgentTaskDto, ChainAgentTasksDto } from './agent-task.dto';
import { successResponse, errorResponse } from '../common/response.helper';

@ApiTags('agents')
@Controller('agents')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class AgentController {
  constructor(private readonly orchestrator: AgentOrchestratorService) {}

  @Post('tasks')
  @ApiOperation({ summary: 'Dispatch a single agent task' })
  async dispatch(@Body() dto: DispatchAgentTaskDto, @Request() req: any) {
    try {
      const data = await this.orchestrator.dispatch(dto, req.user.userId);
      return successResponse(data, 'Agent task dispatched');
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Post('tasks/chain')
  @ApiOperation({ summary: 'Dispatch an ordered chain of agent tasks' })
  async chain(@Body() dto: ChainAgentTasksDto, @Request() req: any) {
    try {
      const data = await this.orchestrator.chain(dto, req.user.userId);
      return successResponse(data, 'Agent chain dispatched');
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get('tasks')
  @ApiOperation({ summary: 'List agent tasks for the current user' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'agentType', required: false })
  @ApiQuery({ name: 'chainId', required: false })
  async list(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('agentType') agentType?: string,
    @Query('chainId') chainId?: string,
  ) {
    try {
      const data = await this.orchestrator.listTasks(req.user.userId, { status, agentType, chainId });
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get('tasks/monitoring')
  @ApiOperation({ summary: 'Get monitoring summary (task counts by status/type)' })
  async monitoring(@Request() req: any) {
    try {
      const data = await this.orchestrator.getMonitoringSummary(req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get a specific agent task' })
  async getOne(@Param('id') id: string, @Request() req: any) {
    try {
      const data = await this.orchestrator.getTask(id, req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Patch('tasks/:id/cancel')
  @ApiOperation({ summary: 'Cancel a pending or failed agent task' })
  async cancel(@Param('id') id: string, @Request() req: any) {
    try {
      const data = await this.orchestrator.cancelTask(id, req.user.userId);
      return successResponse(data, 'Task cancelled');
    } catch (err) {
      return errorResponse(err.message);
    }
  }
}
