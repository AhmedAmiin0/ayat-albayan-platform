import { jobApplicantCreateSchema, jobApplicantUpdateSchema } from '@ab/shared';
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
import { CurrentUser, Roles } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { pageQueryShape, parseOr400 } from '../leads/http';
import { APPLICANT_STATUSES } from './applicant-state-machine';
import { JobApplicantsService } from './job-applicants.service';

const listQuery = z.object({ status: z.enum(APPLICANT_STATUSES).optional(), ...pageQueryShape });
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
@Roles('admin')
@Controller('job-applicants')
export class JobApplicantsController {
  constructor(private readonly applicants: JobApplicantsService) {}

  @Get()
  list(@Query() query: unknown) {
    return this.applicants.list(parseOr400(listQuery, query));
  }

  @Get(':id')
  get(@Param('id', uuid) id: string) {
    return this.applicants.get(id);
  }

  @Post()
  create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.applicants.create(parseOr400(createBody, body), user.id);
  }

  @Patch(':id')
  update(@Param('id', uuid) id: string, @Body() body: unknown) {
    return this.applicants.update(id, parseOr400(updateBody, body));
  }

  @Patch(':id/status')
  changeStatus(
    @Param('id', uuid) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const { status } = parseOr400(statusBody, body);
    return this.applicants.changeStatus({ id, to: status, actorId: user.id });
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', uuid) id: string, @CurrentUser() user: AuthUser) {
    return this.applicants.remove({ id, actorId: user.id });
  }
}
