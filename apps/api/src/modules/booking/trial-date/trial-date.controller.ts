import { bookingRequestSchema, type Conflict, type TrialDateResult, type TrialHistory } from '@ab/shared';
import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '../../../common/auth/decorators';
import type { AuthUser } from '../../../common/auth/verify-token';
import { parseOrThrow } from '../../../common/http/http';
import { clientRequest } from '../core/booking.payload';
import { withPackageSize } from '../plan/package-size';
import { SalesTrialDates } from '../sales/course/sales-trial-date.service';
import { TrialDates } from './trial-date.service';

const historyQuery = z.object({ studentId: z.uuid() });
const bodyOf = (body: unknown) => parseOrThrow(bookingRequestSchema, withPackageSize(body));

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
  history(@Query() query: unknown): Promise<TrialHistory> {
    return this.dates.history(parseOrThrow(historyQuery, query).studentId);
  }

  @Post('trial-date/check')
  @HttpCode(200)
  async check(@Body() body: unknown): Promise<{ conflicts: Conflict[] }> {
    return { conflicts: await this.dates.check(await this.dates.target(bodyOf(body))) };
  }

  @Post('trial-date')
  async pick(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<TrialDateResult> {
    const req = clientRequest(bodyOf(body), user.role);
    return (await this.dates.replay(req, user.id)) ?? this.dates.pick(await this.dates.target(req), user.id);
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
  history(@Query() query: unknown, @CurrentUser() user: AuthUser): Promise<TrialHistory> {
    return this.dates.history(parseOrThrow(historyQuery, query).studentId, user);
  }

  @Post('trial-date/check')
  @HttpCode(200)
  async check(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<{ conflicts: Conflict[] }> {
    return { conflicts: await this.dates.check(bodyOf(body), user) };
  }

  /** 403 not_your_student | override_not_allowed | meeting_link_not_allowed; 400 date_in_past. */
  @Post('trial-date')
  pick(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<TrialDateResult> {
    return this.dates.pick(bodyOf(body), user);
  }
}
