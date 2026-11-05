import {
  reportDraftSchema,
  reportSubmitSchema,
  reportV2DraftSchema,
  reportV2SubmitSchema,
  type ReportDraft,
  type ReportFormResponse,
  type ReportSubmit,
  type ReportV2Draft,
  type ReportV2Submit,
  type ReportView,
} from '@ab/shared';
import { Controller, Get, HttpCode, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Public } from '@/common/auth/decorators';
import { ZodBody, ZodParam } from '@/common/http/zod-inputs';
import { TeacherLinkLimit } from './teacher-link.limit';
import { TeacherLinkReports } from './teacher-link.reports';

/** The link's token (≤ 100: Fastify's maxParamLength) and a report's uuid. */
const tokenSchema = z.string().min(1).max(100);
const idSchema = z.uuid();

/**
 * The teacher's report for ONE lesson without signing in (owner 2026-11-05, docs/19 «Teacher
 * report link»): the signed token in the path grants only that lesson's report form, its drafts
 * and its submit, for that lesson's teacher, from the lesson's start until its end + the edit
 * hours. Same bodies, validation and answers as /lessons/:id/report-form and /reports/:id/…;
 * rate-limited. 404 link_not_found, 410 link_expired, 409 link_not_open, 429 too_many_requests.
 */
@ApiTags('reports')
@Public()
@UseGuards(TeacherLinkLimit)
@Controller('public/teacher-report/:token')
export class TeacherLinkController {
  constructor(private readonly reports: TeacherLinkReports) {}

  @Get()
  async form(@ZodParam('token', tokenSchema) token: string): Promise<ReportFormResponse> {
    return this.reports.form({ token });
  }

  @Put('reports/:id/draft')
  async draft(
    @ZodParam('token', tokenSchema) token: string,
    @ZodParam('id', idSchema) id: string,
    @ZodBody(reportDraftSchema, { sentOnly: true }) form: Partial<ReportDraft>,
  ): Promise<ReportView> {
    return this.reports.draft({ token, reportId: id, form });
  }

  @Post('reports/:id/submit')
  @HttpCode(200)
  async submit(
    @ZodParam('token', tokenSchema) token: string,
    @ZodParam('id', idSchema) id: string,
    @ZodBody(reportSubmitSchema) form: ReportSubmit,
  ): Promise<ReportView> {
    return this.reports.submit({ token, reportId: id, form });
  }

  @Put('reports/:id/v2/draft')
  async draftV2(
    @ZodParam('token', tokenSchema) token: string,
    @ZodParam('id', idSchema) id: string,
    @ZodBody(reportV2DraftSchema, { sentOnly: true }) form: Partial<ReportV2Draft>,
  ): Promise<ReportView> {
    return this.reports.draftV2({ token, reportId: id, form });
  }

  @Post('reports/:id/v2/submit')
  @HttpCode(200)
  async submitV2(
    @ZodParam('token', tokenSchema) token: string,
    @ZodParam('id', idSchema) id: string,
    @ZodBody(reportV2SubmitSchema) form: ReportV2Submit,
  ): Promise<ReportView> {
    return this.reports.submitV2({ token, reportId: id, form });
  }
}
