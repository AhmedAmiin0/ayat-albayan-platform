import {
  assistantStatementRoutes as routes,
  type SignedDownload,
  type SignedUpload,
} from '@ab/shared';
import type { AssistantStatementView } from '@ab/money';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { StatementsService } from './statements.service';

type In<K extends keyof typeof routes> = RouteInputOf<(typeof routes)[K]>;

/**
 * The assistants' monthly statements (R-ASST-03, R-ASST-05): salary + commissions +/- adjustments per
 * currency, draft -> approved -> paid. Every transition answers 409 invalid_transition when repeated.
 * approve, reopen and unpay need assistantpay.approve; reading and generating need read / write.
 */
@ApiBearerAuth()
@Controller()
export class AssistantStatementsController {
  constructor(private readonly statements: StatementsService) {}

  @Route(routes.list)
  list(@RouteInput() { query }: In<'list'>): Promise<AssistantStatementView[]> {
    return this.statements.list(query);
  }

  @Route(routes.get)
  get(@RouteInput() { params }: In<'get'>): Promise<AssistantStatementView> {
    return this.statements.get(params.id);
  }

  @Route(routes.receipt)
  receipt(@RouteInput() { params }: In<'receipt'>): Promise<SignedDownload> {
    return this.statements.receipt(params.id);
  }

  /** Builds or rebuilds the DRAFT of a month (idempotent); 409 invalid_transition once approved. */
  @Route(routes.generate)
  @HttpCode(200)
  generate(
    @RouteInput() { body }: In<'generate'>,
    @CurrentUser() user: AuthUser,
  ): Promise<AssistantStatementView> {
    return this.statements.generate({ ...body, actorId: user.id });
  }

  /** 409 empty_statement when it has no lines. */
  @Route(routes.approve)
  @HttpCode(200)
  approve(
    @RouteInput() { params }: In<'approve'>,
    @CurrentUser() user: AuthUser,
  ): Promise<AssistantStatementView> {
    return this.statements.approve(params.id, user.id);
  }

  /** approved -> draft. Takes back an approval, so it needs the approver's permission. */
  @Route(routes.reopen)
  @HttpCode(200)
  reopen(
    @RouteInput() { params }: In<'reopen'>,
    @CurrentUser() user: AuthUser,
  ): Promise<AssistantStatementView> {
    return this.statements.reopen(params.id, user.id);
  }

  /** approved -> paid, with the transfer's date, method, note and receipt. */
  @Route(routes.pay)
  @HttpCode(200)
  pay(
    @RouteInput() { params, body }: In<'pay'>,
    @CurrentUser() user: AuthUser,
  ): Promise<AssistantStatementView> {
    return this.statements.pay(params.id, body, user.id);
  }

  /** paid -> approved, with a reason. Reverses a payout, so it needs assistantpay.approve. */
  @Route(routes.unpay)
  @HttpCode(200)
  unpay(
    @RouteInput() { params, body }: In<'unpay'>,
    @CurrentUser() user: AuthUser,
  ): Promise<AssistantStatementView> {
    return this.statements.unpay({ id: params.id, reason: body.reason, actorId: user.id });
  }

  /** A signed PUT for the receipt of a payment; register its path in the pay body's receiptPath. */
  @Route(routes.receiptUploadUrl)
  @HttpCode(200)
  receiptUploadUrl(@RouteInput() { body }: In<'receiptUploadUrl'>): Promise<SignedUpload> {
    const { assistantId, ...file } = body;
    return this.statements.uploadUrl(assistantId, file);
  }
}
