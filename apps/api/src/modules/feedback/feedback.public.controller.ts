import type { FeedbackFormView } from '@ab/shared';
import { Body, Controller, Get, HttpCode, Ip, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/auth/decorators';
import { FeedbackPublicService } from './feedback.public.service';

/**
 * The family's page (no login): the signed token in the path is the whole credential. Answers
 * carry nothing beyond the teacher's name, the kind and the prefilled phone.
 */
@ApiTags('feedback')
@Public()
@Controller('public/feedback')
export class FeedbackPublicController {
  constructor(private readonly feedback: FeedbackPublicService) {}

  @Get(':token')
  form(@Param('token') token: string, @Ip() ip: string): Promise<FeedbackFormView> {
    return this.feedback.form({ token, ip });
  }

  /** 409 already_submitted, 410 feedback_expired, 404 feedback_not_found, 429 too_many_requests. */
  @Post(':token')
  @HttpCode(200)
  submit(@Param('token') token: string, @Body() body: unknown, @Ip() ip: string): Promise<{ submitted: true }> {
    return this.feedback.submit({ token, ip, body });
  }
}
