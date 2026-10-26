import { numbersOverlay } from '../../../../common/integrations/numbers-overlay';
import { lineEnvs, loadEnv, type KapsoLineEnv } from '../../../../config/env/env';

/**
 * The number calls ring on (docs/28 §2): the CHAT line, and only while it is on the Kapso driver with
 * its project key (Kapso's Meta proxy carries the calling signaling; a meta or crm chat line cannot
 * call). Module mode: the chat role's default number (its id stamps wa_calls.number_id). Read per call,
 * like every line client, so a saved driver switch applies at once. Holds the key: never log it.
 */
export interface CallingLine {
  env: KapsoLineEnv;
  /** wa_numbers.id under module mode; null under legacy config. */
  numberId: string | null;
}

export function callingLine(): CallingLine | null {
  const env = lineEnvs(loadEnv()).chat;
  if (env?.provider !== 'kapso') return null;
  return { env, numberId: numbersOverlay()?.numberIds.chat ?? null };
}
