import { assistantPayRoutes as routes } from '@ab/shared';
import type {
  AssistantCommissionView,
  AssistantTermsRow,
  AssistantTermsView,
  BroughtByResult,
  BroughtByView,
} from '@ab/money';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { CorrectionsService } from '@/modules/finance/assistant-pay/statements/corrections.service';
import { TermsService } from '@/modules/finance/assistant-pay/terms/terms.service';

type In<K extends keyof typeof routes> = RouteInputOf<(typeof routes)[K]>;

/**
 * The admin side of the assistants' pay (R-ASST-02, R-ASST-03, R-ASST-05): terms per assistant, the
 * commission ledger, voiding, adjustments and attribution. Statements: AssistantStatementsController.
 */
@ApiBearerAuth()
@Controller()
export class AssistantPayController {
  constructor(
    private readonly terms: TermsService,
    private readonly corrections: CorrectionsService,
  ) {}

  @Route(routes.list)
  list(): Promise<AssistantTermsRow[]> {
    return this.terms.list();
  }

  @Route(routes.get)
  get(@RouteInput() { params }: In<'get'>): Promise<AssistantTermsView> {
    return this.terms.get(params.assistantId);
  }

  /** Replaces both parts (null clears one). 404 assistant_not_found. */
  @Route(routes.setTerms)
  set(
    @RouteInput() { params, body }: In<'setTerms'>,
    @CurrentUser() user: AuthUser,
  ): Promise<AssistantTermsView> {
    return this.terms.set({ assistantId: params.assistantId, terms: body, actorId: user.id });
  }

  @Route(routes.broughtByOf)
  broughtByOf(@RouteInput() { params }: In<'broughtByOf'>): Promise<BroughtByView> {
    return this.terms.broughtBy(params.studentId);
  }

  @Route(routes.ledger)
  ledger(@RouteInput() { query }: In<'ledger'>): Promise<AssistantCommissionView[]> {
    return this.corrections.ledger(query);
  }

  /** 404 commission_not_found, 409 already_voided, 400 reason_required. */
  @Route(routes.void)
  @HttpCode(200)
  voidCommission(
    @RouteInput() { params, body }: In<'void'>,
    @CurrentUser() user: AuthUser,
  ): Promise<{ id: string }> {
    const { reason } = body;
    return this.corrections.voidCommission({ commissionId: params.id, reason, actorId: user.id });
  }

  /** A signed amount carried into the next open statement; 404 assistant_not_found. */
  @Route(routes.adjust)
  adjust(
    @RouteInput() { body }: In<'adjust'>,
    @CurrentUser() user: AuthUser,
  ): Promise<{ id: string }> {
    return this.corrections.adjust({ ...body, actorId: user.id });
  }

  /**
   * One student or many (at most 500); assistantId null clears it. 404 student_not_found, 400
   * invalid_assistant, 409 commission_exists.
   */
  @Route(routes.broughtBy)
  @HttpCode(200)
  broughtBy(
    @RouteInput() { body }: In<'broughtBy'>,
    @CurrentUser() user: AuthUser,
  ): Promise<BroughtByResult> {
    return this.corrections.broughtBy(body, user.id);
  }
}
