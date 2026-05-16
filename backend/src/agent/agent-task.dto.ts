import { IsEnum, IsObject, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum AgentTypeDto {
  TREND = 'TREND',
  RESEARCH = 'RESEARCH',
  AFFILIATE = 'AFFILIATE',
  STORY = 'STORY',
  SCRIPT = 'SCRIPT',
  VOICE = 'VOICE',
  VIDEO = 'VIDEO',
  ANALYTICS = 'ANALYTICS',
  OPTIMIZATION = 'OPTIMIZATION',
}

export class DispatchAgentTaskDto {
  @ApiProperty({ enum: AgentTypeDto })
  @IsEnum(AgentTypeDto)
  agentType: AgentTypeDto;

  @ApiProperty({ description: 'Arbitrary JSON input for the agent' })
  @IsObject()
  input: Record<string, any>;

  @ApiProperty({ required: false, description: 'Chain identifier – group tasks into a pipeline' })
  @IsOptional()
  @IsString()
  chainId?: string;

  @ApiProperty({ required: false, description: 'Execution order within the chain (0-based)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  chainOrder?: number;

  @ApiProperty({ required: false, default: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number;
}

export class ChainAgentTasksDto {
  @ApiProperty({ type: [DispatchAgentTaskDto], description: 'Ordered list of agent tasks to chain' })
  tasks: DispatchAgentTaskDto[];

  @ApiProperty({ required: false, description: 'Shared chain ID (auto-generated if omitted)' })
  @IsOptional()
  @IsString()
  chainId?: string;
}
