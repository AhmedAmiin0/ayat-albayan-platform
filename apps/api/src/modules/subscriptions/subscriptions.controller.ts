import {
  subscriptionCreateSchema,
  subscriptionUpdateSchema,
  type QuoteResponse,
  type StudentBalanceView,
  type SubscriptionView,
} from '@ab/shared';
import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow, sentOnly, type Page } from '../teachers/http';
import { PackagesService } from './packages.service';
import { StudentAccess } from './student-access';
import { subscriptionListQuery, subscriptionQuoteSchema } from './subscriptions.dto';
import { SubscriptionCreator, SubscriptionsService } from './subscriptions.service';

/** Packages (S1–S5, R-SUB-01). Admin only; the price comes from the catalog, never the body. */
@ApiTags('subscriptions')
@ApiBearerAuth()
@Roles('admin')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subs: SubscriptionsService,
    private readonly creator: SubscriptionCreator,
  ) {}

  @Get()
  list(@Query() query: unknown): Promise<Page<SubscriptionView>> {
    return this.subs.list(parseOrThrow(subscriptionListQuery, query));
  }

  @Post()
  create(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<SubscriptionView> {
    return this.creator.create(parseOrThrow(subscriptionCreateSchema, body), user.id);
  }

  /** The price the create would store, shown in the dialog before saving. */
  @Post('quote')
  @HttpCode(200)
  quote(@Body() body: unknown): Promise<QuoteResponse> {
    return this.creator.quote(parseOrThrow(subscriptionQuoteSchema, body));
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<SubscriptionView> {
    return this.subs.get(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<SubscriptionView> {
    return this.subs.update(id, sentOnly(parseOrThrow(subscriptionUpdateSchema, body), body), user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<void> {
    await this.subs.remove(id, user.id);
  }
}

/** GET /students/:id/balance (S6, R-SUB-01/03): admin, or the student's teacher. */
@ApiTags('students')
@ApiBearerAuth()
@Roles('admin', 'teacher')
@Controller('students/:id/balance')
export class StudentBalanceController {
  constructor(
    private readonly packages: PackagesService,
    private readonly access: StudentAccess,
  ) {}

  @Get()
  async balance(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<StudentBalanceView> {
    await this.access.check(user, id);
    return this.packages.studentBalance(id);
  }
}
