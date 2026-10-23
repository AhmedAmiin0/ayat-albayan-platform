import type { WaLine } from '@ab/shared';

// Numbers as records (docs/23 §3 phase 3). null = settings.comms_source is legacy (or not loaded): loadEnv()
// is exactly today's (process.env + the integration overlay). In module mode NumbersConfig puts here the
// per-line WA_* / WA_CHAT_* keys built from each role's default enabled number (a role without one gets
// blanks, so it is unconfigured), and loadEnv() lays them over the integration overlay. Plain state with
// a type-only import, so env.ts can read it without a cycle. Holds secrets: never log or return it.

export interface NumbersOverlay {
  values: Readonly<Record<string, string>>;
  /** The number each role's traffic goes out from (messages.number_id at claim). */
  numberIds: Readonly<Partial<Record<WaLine, string>>>;
}

let current: NumbersOverlay | null = null;

export function numbersOverlay(): NumbersOverlay | null {
  return current;
}

export function setNumbersOverlay(next: NumbersOverlay | null): void {
  current = next ? Object.freeze({ values: Object.freeze({ ...next.values }), numberIds: Object.freeze({ ...next.numberIds }) }) : null;
}

/** The role's number in module mode; undefined under legacy (nothing is stamped). */
export function activeNumberId(line: WaLine): string | undefined {
  return current?.numberIds[line];
}
