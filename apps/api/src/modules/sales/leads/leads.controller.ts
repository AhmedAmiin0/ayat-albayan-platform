import { LEAD_SOURCES, LEAD_STATUSES, leadColumnQueryShape, leadFollowUpSchema, leadQualificationPatchSchema } from '@ab/shared';
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { parseOrThrow } from '@/common/http/http';
import { pageQueryShape } from './http';
import { LeadProfileService } from './lead-profile.service';
import { LeadsService } from './leads.service';

const listQuery = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  source: z.enum(LEAD_SOURCES).optional(),
  ...pageQueryShape,
  // `sort`/`dir` + the «مسؤول المتابعة» filter (R-NFR-08, R-LEAD-05).
  ...leadColumnQueryShape,
});
const statusBody = z.object({ status: z.enum(LEAD_STATUSES) });

/** Admin lead inbox (R-LEAD-01, R-LEAD-04). Upsert-by-phone has no route: the webhook calls it. */
@ApiTags('leads')
@ApiBearerAuth()
@Permissions('leads.write')
@Controller('leads')
export class LeadsController {
  constructor(
    private readonly leads: LeadsService,
    private readonly profile: LeadProfileService,
  ) {}

  @Get()
  @Permissions('leads.read')
  list(@Query() query: unknown) {
    return this.leads.list(parseOrThrow(listQuery, query));
  }

  @Patch(':id/status')
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const { status } = parseOrThrow(statusBody, body);
    return this.leads.changeStatus({ id, to: status, actorId: user.id });
  }

  /** One click: lead → job applicant, removed from the funnel (R-LEAD-04). */
  @Post(':id/reclassify')
  reclassify(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.leads.reclassify({ id, actorId: user.id });
  }

  /** L1: merge into leads.qualification; null clears a field (R-LEAD-03). */
  @Patch(':id/qualification')
  qualification(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const patch = parseOrThrow(leadQualificationPatchSchema, body);
    return this.profile.qualification({ id, patch, actorId: user.id });
  }

  /** L2: the admin's per-lead follow-up pause (R-LEAD-05). */
  @Patch(':id/follow-up')
  followUp(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const patch = parseOrThrow(leadFollowUpSchema, body);
    return this.profile.followUp({ id, patch, actorId: user.id });
  }
}
