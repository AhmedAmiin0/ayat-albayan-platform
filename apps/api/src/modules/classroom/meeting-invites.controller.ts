import type { MeetingInviteeOption, MeetingInviteeView, MeetingInviteResult } from '@ab/shared';
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow } from '../../common/http/http';
import { MeetingInvitesService } from './meeting-invites.service';
import { MeetingScheduleService } from './meeting-schedule.service';

const RESEND_PARAMS = z.object({ id: z.uuid(), inviteeId: z.uuid() });

/**
 * Scheduled meetings and invitations (R-MEET-01/02, owner 2026-10-12): anyone with meetings.write
 * (admin, teacher, assistant, sales) picks invitees; the creator or an admin reschedules, cancels,
 * adds invitees and resends (403 otherwise, 404 meeting_not_found, 410 meeting_ended).
 */
@ApiTags('classroom')
@ApiBearerAuth()
@Permissions('meetings.write')
@Controller('meetings')
export class MeetingInvitesController {
  constructor(
    private readonly invites: MeetingInvitesService,
    private readonly schedule: MeetingScheduleService,
  ) {}

  /** `?q=`: staff {id, name, role} and the students the caller may see {id, name, code}. Never a phone. */
  @Get('invitee-options')
  options(@Query() query: unknown, @CurrentUser() user: AuthUser): Promise<MeetingInviteeOption[]> {
    return this.invites.options(user, query);
  }

  /** 204: a new title and/or time (400 starts_in_past | too_far_ahead | not_scheduled); staff are told again. */
  @Patch(':id')
  @HttpCode(204)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<void> {
    await this.schedule.update({ user, id, body });
  }

  /** 204: nobody joins any more, personal links stop working; staff and reached families are told. Twice: a no-op; 410 meeting_ended once ended. */
  @Post(':id/cancel')
  @HttpCode(204)
  async cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<void> {
    await this.schedule.cancel({ user, id });
  }

  @Get(':id/invitees')
  invitees(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<MeetingInviteeView[]> {
    return this.invites.list({ user, id });
  }

  /** One result per new invitee (personal links once; a recipient the race-safe cap stops: failed / invite_limit); 400 too_many_invitees, 409 invite_limit. */
  @Post(':id/invitees')
  @HttpCode(200)
  add(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<MeetingInviteResult[]> {
    return this.invites.add({ user, id, body });
  }

  /** {clientRequestId}: a new personal link for that invitee only; 403 phone_invite_not_allowed, 404 invitee_not_found | student_not_found, 409 invite_limit. */
  @Post(':id/invitees/:inviteeId/resend')
  @HttpCode(200)
  resend(@Param() params: Record<string, string>, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<MeetingInviteResult> {
    const { id, inviteeId } = parseOrThrow(RESEND_PARAMS, params);
    return this.invites.resend({ user, id, inviteeId, body });
  }
}
