import type { NumberPurpose, WaLine } from '@ab/shared';
import type { WhatsappEnv } from '@/config/env/whatsapp/env.whatsapp';

// Numbers as records (docs/23 §3 phase 3). null = settings.comms_source is legacy (or not loaded): loadEnv()
// is exactly today's (process.env + the integration overlay). In module mode NumbersConfig puts here the
// per-line WA_* / WA_CHAT_* keys built from each role's default enabled number (a role without one gets
// blanks, so it is unconfigured), and loadEnv() lays them over the integration overlay. Plain state with
// a type-only import, so env.ts can read it without a cycle. Holds secrets: never log or return it.

/**
 * One wa_numbers row as routing per number needs it (docs/23 phase 5, docs/23c). `env` is built from the
 * row and ITS Vault secrets only (null = it cannot send: disabled, no token, invalid value); it never
 * borrows another number's or a legacy key's credentials. Holds secrets: never log or return it.
 */
export interface OverlayNumber {
  id: string;
  label: string;
  /**
   * `calls` (docs/28 §10): env is always null, so it never sends; inbound on it is still logged.
   */
  purpose: NumberPurpose;
  phone_number_id: string;
  waba_id: string | null;
  enabled: boolean;
  is_default: boolean;
  fallback_rank: number;
  created_at: string;
  env: WhatsappEnv | null;
  /** Its app secret (Vault), for the webhook signature; null = none set. */
  appSecret: string | null;
}

export interface NumbersOverlay {
  values: Readonly<Record<string, string>>;
  /** The number each role's traffic goes out from (messages.number_id at claim). */
  numberIds: Readonly<Partial<Record<WaLine, string>>>;
  /** Every wa_numbers row (enabled or not), phase 5 routing; absent = none loaded (routes nothing). */
  numbers?: readonly OverlayNumber[];
}

let current: NumbersOverlay | null = null;

export function numbersOverlay(): NumbersOverlay | null {
  return current;
}

export function setNumbersOverlay(next: NumbersOverlay | null): void {
  current = next
    ? Object.freeze({
        values: Object.freeze({ ...next.values }),
        numberIds: Object.freeze({ ...next.numberIds }),
        numbers: Object.freeze((next.numbers ?? []).map((n) => Object.freeze({ ...n }))),
      })
    : null;
}

/** Module mode's numbers (phase 5); null under legacy, when routing per number is never used. */
export function overlayNumbers(): readonly OverlayNumber[] | null {
  return current ? (current.numbers ?? []) : null;
}

/** The row Meta names by its phone_number_id (any row, enabled or not); undefined under legacy or unknown. */
export function numberByPhoneId(phoneNumberId: string): OverlayNumber | undefined {
  return current?.numbers?.find((n) => n.phone_number_id === phoneNumberId);
}

/** The role's number in module mode; undefined under legacy (nothing is stamped). */
export function activeNumberId(line: WaLine): string | undefined {
  return current?.numberIds[line];
}
