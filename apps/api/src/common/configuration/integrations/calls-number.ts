import type { KapsoLineEnv } from '@/config/env/whatsapp/env.whatsapp';

// The dedicated calls number (docs/28 §10, owner 2026-10-27): the enabled default wa_numbers row
// whose purpose is `calls`. Loaded by NumbersConfig under BOTH comms sources (a calls number is not
// a messaging line, so legacy keeps it too); null = none, and calls ring on the chat line as
// before. Plain state with a type-only import, like numbers-overlay.ts. Holds the Kapso key: never
// log or return it.

export interface CallsNumber {
  /** wa_numbers.id (stamps wa_calls.number_id). */
  id: string;
  /** Meta's phone_number_id: the webhook routes this number's changes by it. */
  phoneNumberId: string;
  /**
   * Its Kapso connection (the project key); null = it cannot carry a call now (no key / base /
   * WABA).
   */
  env: KapsoLineEnv | null;
}

let current: CallsNumber | null = null;

export function callsNumber(): CallsNumber | null {
  return current;
}

export function setCallsNumber(next: CallsNumber | null): void {
  current = next ? Object.freeze({ ...next }) : null;
}

/** Is this Meta phone_number_id the calls number's? */
export function isCallsPhoneId(phoneNumberId: string | null | undefined): boolean {
  return !!phoneNumberId && current?.phoneNumberId === phoneNumberId;
}
