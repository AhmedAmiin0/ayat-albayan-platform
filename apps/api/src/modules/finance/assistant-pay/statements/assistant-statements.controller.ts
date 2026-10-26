import {
  assistantStatementGenerateSchema,
  assistantReasonSchema,
  assistantStatementPaySchema,
  assistantStatementsQuery,
  type AssistantStatementView,
  type SignedDownload,
  type SignedUpload,
} from '@ab/shared';
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../../common/auth/decorators';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { parseOrThrow } from '../../../../common/http/http';
import { assistantReceiptUploadSchema } from '../assistant-pay.dto';
import { StatementsService } from './statements.service';

/**
 * The assistants' monthly statements (R-ASST-03, R-ASST-05): salary + commissions +/- adjustments per
 * currency, draft -> approved -> paid. Every transition answers 409 invalid_transition when repeated.
 * approve, reopen and unpay need assistantpay.approve; reading and generating need read / write.
 */
@ApiTags('assistant-pay')
@ApiBearerAuth()
@Permissions('assistantpay.write')
@Controller('assistant-pay')
export class AssistantStatementsController {
  constructor(private readonly statements: StatementsService) {}

  @Get('statements')
  @Permissions('assistantpay.read')
  list(@Query() query: unknown): Promise<AssistantStatementView[]> {
    return this.statements.list(parseOrThrow(assistantStatementsQuery, query));
  }

  @Get('statements/:id')
  @Permissions('assistantpay.read')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<AssistantStatementView> {
    return this.statements.get(id);
  }

  @Get('statements/:id/receipt')
  @Permissions('assistantpay.read')
  receipt(@Param('id', ParseUUIDPipe) id: string): Promise<SignedDownload> {
    return this.statements.receipt(id);
  }

  /** Builds or rebuilds the DRAFT of a month (idempotent); 409 invalid_transition once it is approved. */
  @Post('statements')
  @HttpCode(200)
  generate(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<AssistantStatementView> {
    return this.statements.generate({ ...parseOrThrow(assistantStatementGenerateSchema, body), actorId: user.id });
  }

  /** 409 empty_statement when it has no lines. */
  @Post('statements/:id/approve')
  @HttpCode(200)
  @Permissions('assistantpay.approve')
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<AssistantStatementView> {
    return this.statements.approve(id, user.id);
  }

  /** approved -> draft. Takes back an approval, so it needs the approver's permission (assistantpay.approve). */
  @Post('statements/:id/reopen')
  @HttpCode(200)
  @Permissions('assistantpay.approve')
  reopen(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<AssistantStatementView> {
    return this.statements.reopen(id, user.id);
  }

  /** approved -> paid, with the transfer's date, method, note and receipt. */
  @Post('statements/:id/pay')
  @HttpCode(200)
  pay(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<AssistantStatementView> {
    return this.statements.pay(id, parseOrThrow(assistantStatementPaySchema, body ?? {}), user.id);
  }

  /** paid -> approved, with a reason. Reverses a payout, so it needs assistantpay.approve as well. */
  @Post('statements/:id/unpay')
  @HttpCode(200)
  @Permissions('assistantpay.approve')
  unpay(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<AssistantStatementView> {
    const { reason } = parseOrThrow(assistantReasonSchema, body ?? {});
    return this.statements.unpay({ id, reason, actorId: user.id });
  }

  /** A signed PUT for the receipt of a payment; register its path in the pay body's receiptPath. */
  @Post('receipt-upload-url')
  @HttpCode(200)
  receiptUploadUrl(@Body() body: unknown): Promise<SignedUpload> {
    const { assistantId, ...file } = parseOrThrow(assistantReceiptUploadSchema, body);
    return this.statements.uploadUrl(assistantId, file);
  }
}
