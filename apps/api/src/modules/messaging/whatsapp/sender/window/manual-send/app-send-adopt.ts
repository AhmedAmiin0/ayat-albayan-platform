import type { Tables } from '@ab/db';
import { foldText } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { AppSendAdoptRepo } from './app-send-adopt.repo';
import { ReopenCancel } from './reopen-cancel';

/** The held «أرسل عبر واتساب» row as the adopt reads it. */
export type HeldRow = Pick<
  Tables<'messages'>,
  'id' | 'phone_e164' | 'body' | 'line' | 'number_id' | 'created_at' | 'lead_id' | 'dedup_key'
>;

/** An external outbound text of the same phone the held row may adopt (AppSendAdoptRepo.twins). */
export interface TwinRow {
  id: string;
  body: string | null;
  line: string | null;
  number_id: string | null;
}

/** Two known values must agree; an unknown one (a single line, a row never routed) does not. */
const agrees = (a: string | null, b: string | null): boolean => a === null || b === null || a === b;

/** The same text after folding whitespace, from the same line / number; the oldest first. */
export function twinOf(held: Omit<HeldRow, 'id'>, rows: readonly TwinRow[]): TwinRow | null {
  const text = foldText(held.body ?? '');
  const same = (r: TwinRow): boolean =>
    text !== '' &&
    foldText(r.body ?? '') === text &&
    agrees(r.line, held.line) &&
    agrees(r.number_id, held.number_id);
  return rows.find(same) ?? null;
}

/**
 * The app's message stored as its own external row (docs/19: staff sent the held text from
 * WhatsApp Business before tapping, or its echo was stored while the tap was being written):
 * the held row adopts it (one bubble, its wamid and ticks, never sent again) and the family's
 * reopen template goes as on an attach. Run by the tap (AppSend) and by the expiry sweep before
 * it asks staff. false = no twin, or either row moved.
 */
@Injectable()
export class AppSendAdopt {
  constructor(
    private readonly repo: AppSendAdoptRepo,
    private readonly reopens: ReopenCancel,
  ) {}

  async adopt(held: HeldRow, now: Date): Promise<boolean> {
    const twin = twinOf(held, await this.repo.twins(held, now));
    if (!twin || !(await this.repo.adopt(held, twin.id))) return false;
    await this.reopens.afterAttach({ id: held.id, phone_e164: held.phone_e164 });
    return true;
  }
}
