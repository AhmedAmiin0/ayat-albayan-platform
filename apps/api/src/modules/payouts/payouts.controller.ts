import {
  monthParam,
  monthQuery,
  payoutPaySchema,
  type PayoutGenerateResult,
  type PayoutView,
} from '@ab/shared';
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { badRequest } from '../scheduling/errors';
import { parseOrThrow } from '../teachers/http';
import { PayoutsGenerator } from './payouts.generate';
import { PayoutsLedger } from './payouts.ledger';
import { PayoutsService } from './payouts.service';

/** Teacher payouts per month (Y1–Y4, R-PAY-02, R-TCH-04). Admin only. CSV: /exports (B4). */
@ApiTags('payouts')
@ApiBearerAuth()
@Roles('admin')
@Controller('payouts')
export class PayoutsController {
  constructor(
    private readonly payouts: PayoutsService,
    private readonly generator: PayoutsGenerator,
    private readonly ledger: PayoutsLedger,
  ) {}

  @Get()
  async month(@Query() query: unknown): Promise<PayoutView[]> {
    return this.ledger.annotate(await this.payouts.month(parseOrThrow(monthQuery, query).month));
  }

  @Post(':month/generate')
  @HttpCode(200)
  generate(@Param('month') month: string, @CurrentUser() user: AuthUser): Promise<PayoutGenerateResult> {
    if (!monthParam.safeParse(month).success) throw badRequest('invalid_month');
    return this.generator.generate(month, user.id);
  }

  @Post(':id/approve')
  @HttpCode(200)
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<PayoutView> {
    return this.payouts.approve(id, user.id);
  }

  @Post(':id/pay')
  @HttpCode(200)
  pay(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<PayoutView> {
    return this.ledger.pay(id, parseOrThrow(payoutPaySchema, body ?? {}), user.id);
  }
}

const mineQuery = z.object({ month: monthParam.optional() });

/** Y5 GET /teachers/me/payouts?month — the signed-in teacher's own (R-TCH-04). */
@ApiTags('teachers')
@ApiBearerAuth()
@Roles('teacher')
@Controller('teachers/me/payouts')
export class TeacherPayoutsController {
  constructor(
    private readonly payouts: PayoutsService,
    private readonly ledger: PayoutsLedger,
  ) {}

  @Get()
  async mine(@Query() query: unknown, @CurrentUser() user: AuthUser): Promise<PayoutView[]> {
    return this.ledger.annotate(await this.payouts.mine(user.id, parseOrThrow(mineQuery, query).month));
  }
}
