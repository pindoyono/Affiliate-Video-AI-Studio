import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { SubmitForReviewDto, ApproveVideoDto, RejectVideoDto } from './review.dto';
import { successResponse, errorResponse } from '../common/response.helper';

@ApiTags('review')
@Controller('review')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ReviewController {
  constructor(private reviewService: ReviewService) {}

  @Post('submit')
  @ApiOperation({ summary: 'Submit a DRAFT video for review' })
  async submit(@Body() dto: SubmitForReviewDto, @Request() req: any) {
    try {
      const data = await this.reviewService.submitForReview(dto, req.user.userId);
      return successResponse(data, 'Video submitted for review');
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Post('approve')
  @ApiOperation({ summary: 'Approve a video in REVIEW status' })
  async approve(@Body() dto: ApproveVideoDto, @Request() req: any) {
    try {
      const data = await this.reviewService.approve(dto, req.user.userId);
      return successResponse(data, 'Video approved');
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Post('reject')
  @ApiOperation({ summary: 'Reject a video in REVIEW status (returns it to DRAFT)' })
  async reject(@Body() dto: RejectVideoDto, @Request() req: any) {
    try {
      const data = await this.reviewService.reject(dto, req.user.userId);
      return successResponse(data, 'Video rejected');
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get all videos awaiting review for the current user' })
  async getPending(@Request() req: any) {
    try {
      const data = await this.reviewService.getPending(req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  @Get('history/:videoId')
  @ApiOperation({ summary: 'Get the review history for a specific video' })
  @ApiParam({ name: 'videoId', description: 'Video UUID' })
  async getHistory(@Param('videoId') videoId: string, @Request() req: any) {
    try {
      const data = await this.reviewService.getHistory(videoId, req.user.userId);
      return successResponse(data);
    } catch (err) {
      return errorResponse(err.message);
    }
  }
}
