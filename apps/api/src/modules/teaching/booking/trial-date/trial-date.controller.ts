import type { BookingRequest, Conflict, TrialDateResult, TrialHistory } from '@ab/shared';
import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodQuery } from '@/common/http/zod-inputs';
import { clientRequest } from '@/modules/teaching/booking/core/booking.payload';
import { bookingBodySchema } from '@/modules/teaching/booking/plan/package-size';
import { SalesTrialDates } from '@/modules/teaching/booking/sales/course/sales-trial-date.service';
import { TrialDates } from './trial-date.service';

const historyQuery = z.object({ studentId: z.uuid() });
type HistoryQuery = z.output<typeof historyQuery>;

/**
 * «موعد تجريبي جديد» from the student file (owner 2026-10-25): the booking wizard's trial body for ONE
 * existing student. An upcoming trial moves (kept as «نُقلت»), else a new trial lesson is booked. Admin
 * only, like POST /booking (override reason, custom link). 400 trial_date_invalid, 404 student_not_found,
 * 409 trial_date_subscribed | conflict | trial_changed.
 */
@ApiTags('booking')
@ApiBearerAuth()
@Permissions('booking.write')
@Controller('booking')
export class TrialDateController {
  constructor(private readonly dates: TrialDates) {}

  /** «مواعيد الحلقة التجريبية»: every trial time picked for the student, newest first. */
  @Get('trial-dates')
  history(@ZodQuery(historyQuery) query: HistoryQuery): Promise<TrialHistory> {
    return this.dates.history(query.studentId);
  }

  @Post('trial-date/check')
  @HttpCode(200)
  async check(@ZodBody(bookingBodySchema) req: BookingRequest): Promise<{ conflicts: Conflict[] }> {
    return { conflicts: await this.dates.check(await this.dates.target(req)) };
  }

  @Post('trial-date')
  async pick(
    @ZodBody(bookingBodySchema) body: BookingRequest,
    @CurrentUser() user: AuthUser,
  ): Promise<TrialDateResult> {
    const req = clientRequest(body, user.role);
    return (
      (await this.dates.replay(req, user.id)) ??
      this.dates.pick(await this.dates.target(req), user.id)
    );
  }
}

/** The same for an assistant from the family's chat, scoped like her trial booking (SalesTrialDates). */
@ApiTags('booking')
@ApiBearerAuth()
@Permissions('self.sales')
@Controller('sales/booking')
export class SalesTrialDateController {
  constructor(private readonly dates: SalesTrialDates) {}

  @Get('trial-dates')
  history(
    @ZodQuery(historyQuery) query: HistoryQuery,
    @CurrentUser() user: AuthUser,
  ): Promise<TrialHistory> {
    return this.dates.history(query.studentId, user);
  }

  @Post('trial-date/check')
  @HttpCode(200)
  async check(
    @ZodBody(bookingBodySchema) req: BookingRequest,
    @CurrentUser() user: AuthUser,
  ): Promise<{ conflicts: Conflict[] }> {
    return { conflicts: await this.dates.check(req, user) };
  }

  /** 403 not_your_student | override_not_allowed; 400 date_in_past | meeting_link_invalid. */
  @Post('trial-date')
  pick(
    @ZodBody(bookingBodySchema) req: BookingRequest,
    @CurrentUser() user: AuthUser,
  ): Promise<TrialDateResult> {
    return this.dates.pick(req, user);
  }
}
