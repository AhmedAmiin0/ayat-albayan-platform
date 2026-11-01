import { applicantColumnQueryShape, jobApplicantCreateSchema, jobApplicantUpdateSchema } from '@ab/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { parseOrThrow } from '@/common/http/http';
import { pageQueryShape } from '@/modules/sales/leads/http';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { APPLICANT_STATUSES } from './applicant-state-machine';
import { JobApplicantsService } from './job-applicants.service';

/** Paging + `q`, status, column filters and `sort`/`dir` (R-NFR-08). */
const listQuery = z.object({
  status: z.preprocess((v) => (v === '' ? undefined : v), z.enum(APPLICANT_STATUSES).optional()),
  ...pageQueryShape,
  ...applicantColumnQueryShape,
});
// Status moves only via PATCH :id/status; from_lead_id is set only by lead reclassify.
const createBody = jobApplicantCreateSchema.omit({ status: true, from_lead_id: true });
const updateBody = jobApplicantUpdateSchema
  .omit({ status: true, from_lead_id: true })
  .refine((o) => Object.keys(o).length > 0, { message: 'empty_update' });
const statusBody = z.object({ status: z.enum(APPLICANT_STATUSES) });
const uuid = new ParseUUIDPipe();

/** Admin CRUD for job applicants (R-LEAD-04). */
@ApiTags('job-applicants')
@ApiBearerAuth()
@Permissions('applicants.write')
@Controller('job-applicants')
export class JobApplicantsController {
  constructor(private readonly applicants: JobApplicantsService) {}

  @Get()
  @Permissions('applicants.read')
  list(@Query() query: unknown) {
    return this.applicants.list(parseOrThrow(listQuery, query));
  }

  @Get(':id')
  @Permissions('applicants.read')
  get(@Param('id', uuid) id: string) {
    return this.applicants.get(id);
  }

  @Post()
  create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.applicants.create(parseOrThrow(createBody, body), user.id);
  }

  @Patch(':id')
  update(@Param('id', uuid) id: string, @Body() body: unknown) {
    return this.applicants.update(id, parseOrThrow(updateBody, body));
  }

  @Patch(':id/status')
  changeStatus(
    @Param('id', uuid) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const { status } = parseOrThrow(statusBody, body);
    return this.applicants.changeStatus({ id, to: status, actorId: user.id });
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', uuid) id: string, @CurrentUser() user: AuthUser) {
    return this.applicants.remove({ id, actorId: user.id });
  }
}
