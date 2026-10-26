import { ACCOUNT_CODE_TEMPLATE } from '@ab/shared';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { overlayNumbers } from '../../../../common/integrations/numbers-overlay';
import { SendGate } from '../gate/send-gate';
import { routeOf } from '../numbers/number-route';
import { NumberRoutes } from '../numbers/number-routes';
import { MessageDispatch, type SendVia } from '../sender/message.dispatch';
import { lineOf } from '../sender/send-line';
import type { DueMessage } from '../sender/sender.due';
import { SenderQueries } from '../sender/sender.queries';
import { WaError, type TemplateRow } from '../whatsapp.types';

/** sent | unavailable (gate closed, template not approved, no line / number can send it) | failed (the provider refused). */
type CodeSendResult = { status: 'sent' } | { status: 'unavailable' } | { status: 'failed'; error: string };

/**
 * The sign-in / password code (docs/30 §4): ONE authentication-template send, now, through the same
 * MessageDispatch the outbox uses (driver per line; module mode routes it to a number). Never queued:
 * a `messages` row would keep the code in template_params, readable by staff in the chat. Respects the
 * send gate and WA_ALLOWED_RECIPIENTS (dispatch.ready). Never retried: the user asks again.
 */
@Injectable()
export class CodeSend {
  /** Property-injected (the constructor is at the 3-parameter limit); absent = module mode sends nothing. */
  @Optional() @Inject(NumberRoutes) private readonly routes?: NumberRoutes;

  constructor(
    private readonly gate: SendGate,
    private readonly queries: SenderQueries,
    private readonly dispatch: MessageDispatch,
  ) {}

  /** Can a code go out now? (the template approved and the gate open; the line is checked at send). */
  async available(): Promise<boolean> {
    return (await this.template()) !== null && (await this.gate.open());
  }

  async send(input: { phone: string; code: string }): Promise<CodeSendResult> {
    const template = await this.template();
    if (!template || !(await this.gate.open())) return { status: 'unavailable' };
    const row = codeRow({ ...input, template });
    const via = await this.via(row, template);
    if (!via || !this.dispatch.ready(row, via)) return { status: 'unavailable' };
    try {
      await this.dispatch.send(row, template, via);
      return { status: 'sent' };
    } catch (e) {
      return { status: 'failed', error: e instanceof WaError && e.info.code !== null ? `wa_${e.info.code}` : 'send_failed' };
    }
  }

  private async template(): Promise<TemplateRow | null> {
    return (await this.queries.approvedTemplates()).find((t) => t.key === ACCOUNT_CODE_TEMPLATE) ?? null;
  }

  /** Legacy: the template's line (notifications). Module mode: the number routing picks, as for any template. */
  private async via(row: DueMessage, template: TemplateRow): Promise<SendVia | null> {
    const numbers = overlayNumbers();
    if (numbers === null) return lineOf(row, template, this.queries.chatConfigured);
    if (!this.routes) return null;
    const { pass } = await this.routes.pass(numbers);
    return routeOf(pass, { row, template });
  }
}

/** An in-memory row for the dispatch: the code fills {{1}} and the copy-code button; nothing is stored. */
export function codeRow(input: { phone: string; code: string; template: Pick<TemplateRow, 'key'> }): DueMessage {
  return {
    id: 'account-code',
    phone_e164: input.phone,
    lead_id: null,
    lesson_id: null,
    template_key: input.template.key,
    template_params: { '1': input.code, button: input.code },
    body: null,
    reply_to_wa_id: null,
    dedup_key: null,
    created_by: null,
    attempts: 0,
    expires_at: null,
    error_code: null,
    line: null,
    number_id: null,
    lesson: null,
    guardian: null,
    lead: null,
  };
}
