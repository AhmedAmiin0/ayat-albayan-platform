import { meetingInviteRoutes as routes } from '@ab/schedule';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { MeetingInvitesService } from './meeting-invites.service';
import { MeetingScheduleService } from '@/modules/teaching/classroom/meetings/schedule/meeting-schedule.service';

type In<K extends keyof typeof routes> = RouteInputOf<(typeof routes)[K]>;

/**
 * Scheduled meetings and invitations (R-MEET-01/02): anyone with meetings.write (admin, teacher,
 * assistant, sales) picks invitees; the creator or an admin reschedules, cancels, adds invitees
 * and resends (403 otherwise, 404 meeting_not_found, 410 meeting_ended).
 */
@ApiBearerAuth()
@Controller()
export class MeetingInvitesController {
  constructor(
    private readonly invites: MeetingInvitesService,
    private readonly schedule: MeetingScheduleService,
  ) {}

  /** Staff {id, name, role} and the students the caller may see {id, name, code}. Never a phone. */
  @Route(routes.inviteeOptions)
  options(@RouteInput() { query }: In<'inviteeOptions'>, @CurrentUser() user: AuthUser) {
    return this.invites.options(user, query);
  }

  @Route(routes.update)
  @HttpCode(204)
  async update(@RouteInput() { params, body }: In<'update'>, @CurrentUser() user: AuthUser) {
    await this.schedule.update({ user, id: params.id, patch: body });
  }

  /** Staff and reached families are told; twice is a no-op; 410 meeting_ended once ended. */
  @Route(routes.cancel)
  @HttpCode(204)
  async cancel(@RouteInput() { params }: In<'cancel'>, @CurrentUser() user: AuthUser) {
    await this.schedule.cancel({ user, id: params.id });
  }

  @Route(routes.invitees)
  invitees(@RouteInput() { params }: In<'invitees'>, @CurrentUser() user: AuthUser) {
    return this.invites.list({ user, id: params.id });
  }

  /** A recipient the race-safe cap stops is answered failed / invite_limit. */
  @Route(routes.add)
  @HttpCode(200)
  add(@RouteInput() { params, body }: In<'add'>, @CurrentUser() user: AuthUser) {
    return this.invites.add({ user, id: params.id, invitees: body.invitees });
  }

  /** 403 phone_invite_not_allowed, 404 invitee_not_found | student_not_found, 409 invite_limit. */
  @Route(routes.resend)
  @HttpCode(200)
  resend(@RouteInput() { params, body }: In<'resend'>, @CurrentUser() user: AuthUser) {
    const { id, inviteeId } = params;
    return this.invites.resend({ user, id, inviteeId, clientRequestId: body.clientRequestId });
  }
}
