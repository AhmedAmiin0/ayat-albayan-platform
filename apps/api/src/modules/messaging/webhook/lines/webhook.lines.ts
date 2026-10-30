import type { NumberPurpose, WaLine } from '@ab/shared';
import type { LineNumbers } from '../../../../config/env/env';

// Which WhatsApp line a webhook change came in on (docs/12 §13.6). Pure.

/** True when no number is configured, the change carries no id, or the id is one of our lines. */
export function acceptsNumber(numbers: LineNumbers, id: string | undefined): boolean {
  const configured = Object.values(numbers).filter((n): n is string => typeof n === 'string');
  return configured.length === 0 || !id || configured.includes(id);
}

/** The receiving line, stamped ONLY while the chat line is configured; null otherwise. */
export function lineFor(numbers: LineNumbers, id: string | undefined): WaLine | null {
  if (!numbers.chat || !id) return null;
  if (id === numbers.chat) return 'chat';
  return id === numbers.notifications ? 'notifications' : null;
}

/** What the webhook needs of one wa_numbers row in module mode (docs/23c decision 7). */
export interface ReceivingNumber {
  id: string;
  purpose: NumberPurpose;
  phone_number_id: string;
}

/** Where a change came in: its line (null = unstamped) and, in module mode, its wa_numbers id. */
export interface Receiving {
  line: NumberPurpose | null;
  numberId?: string;
  /** Meta's phone_number_id of the change, when it carried one. */
  phoneNumberId?: string;
}

/** The event fields of a Receiving: line always, numberId / phoneNumberId only when known. */
export function where(at: Receiving): Receiving {
  return {
    line: at.line,
    ...(at.numberId ? { numberId: at.numberId } : {}),
    ...(at.phoneNumberId ? { phoneNumberId: at.phoneNumberId } : {}),
  };
}

/**
 * Module mode: ANY number row, enabled or not («off = no sends, inbound still logged»), stamps its id and
 * purpose; a change with no id, or any change while no number row exists (as acceptsNumber does with no
 * line: Meta never retries a 200, so nothing is dropped), is kept unstamped; an unknown id → null (ignored).
 */
export function receivingNumber(numbers: readonly ReceivingNumber[], id: string | undefined): Receiving | null {
  if (!id || numbers.length === 0) return { line: null };
  const n = numbers.find((x) => x.phone_number_id === id);
  return n ? { line: n.purpose, numberId: n.id } : null;
}

/**
 * Legacy (no numbers overlay): a change for the dedicated calls number (docs/28 §10) is kept,
 * stamped line `calls` and its number, so a family's message to it lands in their thread and its
 * call events reach the calls flow; any other id → null (the line rules decide).
 */
function callsReceiving(
  calls: ReceivingNumber | null | undefined,
  id: string | undefined,
): Receiving | null {
  return calls && id && calls.phone_number_id === id ? { line: 'calls', numberId: calls.id } : null;
}

/** Which changes a webhook keeps (docs/12 §13.6, docs/23c decision 7, docs/28 §10). */
export interface ReceiveOptions {
  /** Our lines' phone-number ids: changes for any other number are ignored. None = accept all. */
  numbers?: LineNumbers;
  /** Told the phone_number_id of every change ignored as neither line (docs/12 §13.6). */
  onIgnored?: (id: string) => void;
  /**
   * Module mode (docs/23c decision 7): every wa_numbers row; absent / null = legacy (`numbers`).
   */
  overlay?: readonly ReceivingNumber[] | null;
  /**
   * Legacy: the dedicated calls number (docs/28 §10), kept as line `calls`; module mode finds it in
   * `overlay`.
   */
  calls?: ReceivingNumber | null;
}

/** Where a change for `number` came in; null = ignored (reported via onIgnored). */
export function receiving(number: string | undefined, ctx: ReceiveOptions): Receiving | null {
  const numbers = ctx.numbers ?? {};
  const legacy = () =>
    callsReceiving(ctx.calls, number) ??
    (acceptsNumber(numbers, number) ? { line: lineFor(numbers, number) } : null);
  const at = ctx.overlay ? receivingNumber(ctx.overlay, number) : legacy();
  if (!at) {
    if (number) ctx.onIgnored?.(number);
    return null;
  }
  return number ? { ...at, phoneNumberId: number } : at;
}
