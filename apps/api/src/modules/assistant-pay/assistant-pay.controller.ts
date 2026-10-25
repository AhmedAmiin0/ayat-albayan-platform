import {
  assistantAdjustmentSchema,
  assistantReasonSchema,
  assistantTermsSchema,
  broughtBySchema,
  type AssistantCommissionView,
  type AssistantTermsRow,
  type AssistantTermsView,
  type BroughtByResult,
  type BroughtByView,
} from '@ab/shared';
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow } from '../../common/http/http';
import { commissionsQuery } from './assistant-pay.dto';
import { CorrectionsService } from './corrections.service';
import { TermsService } from './terms.service';

/**
 * The admin side of the assistants' pay (R-ASST-02, R-ASST-03, R-ASST-05): terms per assistant, the
 * commission ledger, voiding, adjustments and attribution. Statements: AssistantStatementsController.
 */
@ApiTags('assistant-pay')
@ApiBearerAuth()
@Permissions('assistantpay.write')
@Controller('assistant-pay')
export class AssistantPayController {
  constructor(
    private readonly terms: TermsService,
    private readonly corrections: CorrectionsService,
  ) {}

  @Get('terms')
  @Permissions('assistantpay.read')
  list(): Promise<AssistantTermsRow[]> {
    return this.terms.list();
  }

  @Get('terms/:assistantId')
  @Permissions('assistantpay.read')
  get(@Param('assistantId', ParseUUIDPipe) assistantId: string): Promise<AssistantTermsView> {
    return this.terms.get(assistantId);
  }

  /** Replaces both parts (null clears one). 404 assistant_not_found. */
  @Put('terms/:assistantId')
  set(@Param('assistantId', ParseUUIDPipe) assistantId: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<AssistantTermsView> {
    return this.terms.set({ assistantId, terms: parseOrThrow(assistantTermsSchema, body), actorId: user.id });
  }

  /** The student profile's «جُلب بواسطة»; 404 student_not_found. */
  @Get('brought-by/:studentId')
  @Permissions('assistantpay.read')
  broughtByOf(@Param('studentId', ParseUUIDPipe) studentId: string): Promise<BroughtByView> {
    return this.terms.broughtBy(studentId);
  }

  @Get('commissions')
  @Permissions('assistantpay.read')
  ledger(@Query() query: unknown): Promise<AssistantCommissionView[]> {
    return this.corrections.ledger(parseOrThrow(commissionsQuery, query));
  }

  /** 404 commission_not_found, 409 already_voided, 400 reason_required. */
  @Post('commissions/:id/void')
  @HttpCode(200)
  voidCommission(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<{ id: string }> {
    const { reason } = parseOrThrow(assistantReasonSchema, body);
    return this.corrections.voidCommission({ commissionId: id, reason, actorId: user.id });
  }

  /** A signed amount carried into the next open statement; 404 assistant_not_found. */
  @Post('adjustments')
  adjust(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<{ id: string }> {
    return this.corrections.adjust({ ...parseOrThrow(assistantAdjustmentSchema, body), actorId: user.id });
  }

  /** One student or many (at most 500); assistantId null clears it. 404 student_not_found, 400 invalid_assistant, 409 commission_exists. */
  @Post('brought-by')
  @HttpCode(200)
  broughtBy(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<BroughtByResult> {
    return this.corrections.broughtBy(parseOrThrow(broughtBySchema, body), user.id);
  }
}
