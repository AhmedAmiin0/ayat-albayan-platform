import { feedbackPublicRoutes as routes } from '@ab/shared';
import { Body, Controller, HttpCode, Ip, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/auth/decorators';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { FeedbackPublicService } from './feedback.public.service';

/**
 * The family's page (no login): the signed token in the path is the whole credential. Answers
 * carry nothing beyond the teacher's name, the kind and the prefilled phone.
 */
@ApiTags('feedback')
@Public()
@Controller()
export class FeedbackPublicController {
  constructor(private readonly feedback: FeedbackPublicService) {}

  @Route(routes.form)
  form(@RouteInput() { params }: RouteInputOf<typeof routes.form>, @Ip() ip: string) {
    return this.feedback.form({ token: params.token, ip });
  }

  /**
   * 409 already_submitted, 410 feedback_expired, 404 feedback_not_found, 429 too_many_requests,
   * all before a bad body's 400: the service parses the body after the token checks.
   */
  @Route(routes.submit)
  @HttpCode(200)
  submit(@Param('token') token: string, @Body() body: unknown, @Ip() ip: string) {
    return this.feedback.submit({ token, ip, body });
  }
}
