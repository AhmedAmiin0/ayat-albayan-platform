import { ACCOUNT_CODE_TEMPLATE } from '@ab/shared';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { overlayNumbers } from '@/common/configuration/integrations/numbers-overlay';
import { lineProvider, loadEnv } from '@/config/env/env';
import { SendGate } from '@/modules/messaging/whatsapp/gate/send-gate';
import { routeOf } from '@/modules/messaging/whatsapp/numbers/number-route';
import { NumberRoutes } from '@/modules/messaging/whatsapp/numbers/number-routes';
import { MessageDispatch, type SendVia } from '@/modules/messaging/whatsapp/sender/message.dispatch';
import type { DueMessage } from '@/modules/messaging/whatsapp/sender/sender.due';
import { SenderRepo } from '@/modules/messaging/whatsapp/sender/sender.repo';
import { WaError, type TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';

/** The line every sign-in / password code leaves from (docs/30 §4). */
const CODE_LINE = 'chat' as const;

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
    private readonly queries: SenderRepo,
    private readonly dispatch: MessageDispatch,
  ) {}

  /** Can a code go out now? The template approved, the gate open and a chat line / number that can send it. */
  async available(): Promise<boolean> {
    const template = await this.template();
    if (!template || !(await this.gate.open())) return false;
    return (await this.via(codeRow({ phone: '', code: '', template }), template)) !== null;
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

  /**
   * The CHAT line only (owner 2026-10-29: «For login make it with chat number»), never a fallback to
   * notifications: no chat line (or number) that can send = unavailable. Legacy: the chat line's own
   * client. Module mode: routing over the enabled chat numbers only. Never a crm line or number
   * (docs/30 §4): the CRM's inbox would show the code to its users, and its OTP button is untested.
   */
  private async via(row: DueMessage, template: TemplateRow): Promise<SendVia | null> {
    const numbers = overlayNumbers();
    if (numbers === null) {
      if (!this.queries.chatConfigured) return null;
      return lineProvider(loadEnv(), CODE_LINE) === 'crm' ? null : CODE_LINE;
    }
    if (!this.routes) return null;
    const chat = numbers.filter((n) => n.purpose === CODE_LINE && n.env?.provider !== 'crm');
    const { pass } = await this.routes.pass(chat);
    const route = routeOf(pass, { row, template: { ...template, line: CODE_LINE, number_id: null } });
    return route?.line === CODE_LINE ? route : null;
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
