import { teacherLinkRoutes as routes, type ReportFormResponse, type ReportView } from '@ab/shared';
import { Controller, Get, HttpCode, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Public } from '@/common/auth/decorators';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { ZodParam } from '@/common/http/zod-inputs';
import { TeacherLinkLimit } from './teacher-link.limit';
import { TeacherLinkReports } from './teacher-link.reports';

type Input<K extends keyof typeof routes> = RouteInputOf<(typeof routes)[K]>;

/** The link's token (≤ 100: Fastify's maxParamLength). */
const tokenSchema = z.string().min(1).max(100);

/**
 * The teacher's report for ONE lesson without signing in (docs/19 «Teacher
 * report link»): the signed token in the path grants only that lesson's report form, its drafts
 * and its submit, for that lesson's teacher, from the lesson's start until its end + the edit
 * hours. Same bodies, validation and answers as /lessons/:id/report-form and /reports/:id/…;
 * rate-limited. 404 link_not_found, 410 link_expired, 409 link_not_open, 429 too_many_requests.
 */
@Public()
@UseGuards(TeacherLinkLimit)
@Controller()
export class TeacherLinkController {
  constructor(private readonly reports: TeacherLinkReports) {}

  @Get('public/teacher-report/:token')
  @ApiTags('reports')
  async form(@ZodParam('token', tokenSchema) token: string): Promise<ReportFormResponse> {
    return this.reports.form({ token });
  }

  @Route(routes.draft)
  draft(@RouteInput() { params, body }: Input<'draft'>): Promise<ReportView> {
    return this.reports.draft({ token: params.token, reportId: params.id, form: body });
  }

  @Route(routes.submit)
  @HttpCode(200)
  submit(@RouteInput() { params, body }: Input<'submit'>): Promise<ReportView> {
    return this.reports.submit({ token: params.token, reportId: params.id, form: body });
  }

  @Route(routes.draftV2)
  draftV2(@RouteInput() { params, body }: Input<'draftV2'>): Promise<ReportView> {
    return this.reports.draftV2({ token: params.token, reportId: params.id, form: body });
  }

  @Route(routes.submitV2)
  @HttpCode(200)
  submitV2(@RouteInput() { params, body }: Input<'submitV2'>): Promise<ReportView> {
    return this.reports.submitV2({ token: params.token, reportId: params.id, form: body });
  }
}
