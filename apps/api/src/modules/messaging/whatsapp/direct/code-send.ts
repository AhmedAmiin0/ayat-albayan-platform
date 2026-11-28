import { ACCOUNT_CODE_TEMPLATE } from '@ab/shared';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { overlayNumbers, type OverlayNumber } from '@/common/configuration/integrations/numbers-overlay';
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

/** sent | unavailable (gate closed, not approved, no line / number can send it) | failed. */
type CodeSendResult = { status: 'sent' } | { status: 'unavailable' } | { status: 'failed'; error: string };

/**
 * The sign-in / password code (docs/30 §4): ONE authentication-template send, now, through the same
 * MessageDispatch the outbox uses (driver per line; module mode routes it to a number). Never
 * queued: a `messages` row would keep the code in template_params, readable by staff in the chat.
 * Respects the send gate and WA_ALLOWED_RECIPIENTS (dispatch.ready). Never retried: the user asks
 * again.
 */
interface CodeAt {
  row: DueMessage;
  template: TemplateRow;
}

const sent = (): CodeSendResult => ({ status: 'sent' });

/** A provider refusal by its Meta code (wa_<code>), else send_failed. */
const failedWith = (e: unknown): CodeSendResult => ({
  status: 'failed',
  error: e instanceof WaError && e.info.code !== null ? `wa_${e.info.code}` : 'send_failed',
});

/**
 * Drivers a login code never leaves from: the CRM (its inbox shows the code) and Evolution (an
 * Evolution Baileys number is unofficial; a code must come from the academy's official number).
 */
const NO_CODES: ReadonlySet<string | undefined> = new Set(['crm', 'evolution']);

@Injectable()
export class CodeSend {
  constructor(
    private readonly gate: SendGate,
    private readonly queries: SenderRepo,
    private readonly dispatch: MessageDispatch,
    /** Absent = module mode sends nothing. */
    @Optional() @Inject(NumberRoutes) private readonly routes?: NumberRoutes,
  ) {}

  /** Can a code go out now? The template approved, the gate open, a chat line / number for it. */
  async available(): Promise<boolean> {
    const template = await this.openTemplate();
    if (!template) return false;
    return (await this.via(codeRow({ phone: '', code: '', template }), template)) !== null;
  }

  async send(input: { phone: string; code: string }): Promise<CodeSendResult> {
    const template = await this.openTemplate();
    if (!template) return { status: 'unavailable' };
    const row = codeRow({ ...input, template });
    const via = await this.via(row, template);
    if (!via || !this.dispatch.ready(row, via)) return { status: 'unavailable' };
    return this.dispatch.send(row, template, via).then(sent, failedWith);
  }

  /** The approved code template, only while the send gate is open (asked only when approved). */
  private async openTemplate(): Promise<TemplateRow | null> {
    const template = await this.template();
    return template && (await this.gate.open()) ? template : null;
  }

  private async template(): Promise<TemplateRow | null> {
    const approved = await this.queries.approvedTemplates();
    return approved.find((t) => t.key === ACCOUNT_CODE_TEMPLATE) ?? null;
  }

  /**
   * The CHAT line only (login codes leave from the chat number), never a fallback to
   * notifications: no chat line (or number) that can send = unavailable. Legacy: the chat line's
   * own client. Module mode: routing over the enabled chat numbers only. Never a crm line or number
   * (docs/30 §4): the CRM's inbox would show the code to its users, and its OTP button is untested.
   */
  private async via(row: DueMessage, template: TemplateRow): Promise<SendVia | null> {
    const numbers = overlayNumbers();
    return numbers === null ? this.lineVia() : this.numberVia(numbers, { row, template });
  }

  /** Legacy: the chat line's own client, unless its driver never sends codes. */
  private lineVia(): SendVia | null {
    if (!this.queries.chatConfigured) return null;
    return NO_CODES.has(lineProvider(loadEnv(), CODE_LINE)) ? null : CODE_LINE;
  }

  /** Module mode: routing over the enabled chat numbers whose driver may send codes. */
  private async numberVia(numbers: readonly OverlayNumber[], at: CodeAt): Promise<SendVia | null> {
    if (!this.routes) return null;
    const chat = numbers.filter((n) => n.purpose === CODE_LINE && !NO_CODES.has(n.env?.provider));
    const { pass } = await this.routes.pass(chat);
    const template = { ...at.template, line: CODE_LINE, number_id: null };
    const route = routeOf(pass, { row: at.row, template });
    return route?.line === CODE_LINE ? route : null;
  }
}

/**
 * An in-memory row for the dispatch: the code fills {{1}} and the copy-code button; nothing is
 * stored.
 */
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
