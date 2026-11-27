import { leadColumnQueryShape, leadWriteRoutes as routes } from '@ab/shared';
import { LEAD_SOURCES, LEAD_STATUSES } from '@ab/catalog';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { parseOrThrow } from '@/common/http/http';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { pageQueryShape } from './http';
import { LeadProfileService } from './lead-profile.service';
import { LeadsService } from './leads.service';

const listQuery = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  source: z.enum(LEAD_SOURCES).optional(),
  ...pageQueryShape,
  // R-NFR-08, R-LEAD-05.
  ...leadColumnQueryShape,
});

/** Admin lead inbox (R-LEAD-01, R-LEAD-04). Upsert-by-phone has no route: the webhook calls it. */
@ApiTags('leads')
@ApiBearerAuth()
@Controller()
export class LeadsController {
  constructor(
    private readonly leads: LeadsService,
    private readonly profile: LeadProfileService,
  ) {}

  @Get('leads')
  @Permissions('leads.read')
  list(@Query() query: unknown) {
    return this.leads.list(parseOrThrow(listQuery, query));
  }

  @Route(routes.changeStatus)
  changeStatus(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.changeStatus>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.leads.changeStatus({ id: params.id, to: body.status, actorId: user.id });
  }

  /** One click: lead → job applicant, removed from the funnel (R-LEAD-04). */
  @Route(routes.reclassify)
  reclassify(
    @RouteInput() { params }: RouteInputOf<typeof routes.reclassify>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.leads.reclassify({ id: params.id, actorId: user.id });
  }

  /** L1: merge into leads.qualification; null clears a field (R-LEAD-03). */
  @Route(routes.qualification)
  qualification(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.qualification>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.profile.qualification({ id: params.id, patch: body, actorId: user.id });
  }

  /** L2: the admin's per-lead follow-up pause (R-LEAD-05). */
  @Route(routes.followUp)
  followUp(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.followUp>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.profile.followUp({ id: params.id, patch: body, actorId: user.id });
  }
}
