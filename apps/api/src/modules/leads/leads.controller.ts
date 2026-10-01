import { LEAD_SOURCES, LEAD_STATUSES } from '@ab/shared';
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { pageQueryShape, parseOr400 } from './http';
import { LeadsService } from './leads.service';

const listQuery = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  source: z.enum(LEAD_SOURCES).optional(),
  ...pageQueryShape,
});
const statusBody = z.object({ status: z.enum(LEAD_STATUSES) });

/** Admin lead inbox (R-LEAD-01, R-LEAD-04). Upsert-by-phone has no route: the webhook calls it. */
@ApiTags('leads')
@ApiBearerAuth()
@Roles('admin')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  list(@Query() query: unknown) {
    return this.leads.list(parseOr400(listQuery, query));
  }

  @Patch(':id/status')
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const { status } = parseOr400(statusBody, body);
    return this.leads.changeStatus({ id, to: status, actorId: user.id });
  }

  /** One click: lead → job applicant, removed from the funnel (R-LEAD-04). */
  @Post(':id/reclassify')
  reclassify(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.leads.reclassify({ id, actorId: user.id });
  }
}
