import { callsNumber } from '../../../../common/integrations/calls-number';
import { numbersOverlay } from '../../../../common/integrations/numbers-overlay';
import { lineEnvs, loadEnv, type KapsoLineEnv } from '../../../../config/env/env';

/**
 * The number calls ring on (docs/28 §2, §10): the dedicated CALLS number when one is the enabled
 * default of purpose `calls` (Kapso only; null when it cannot carry a call now: never a silent fall
 * back to the chat line, which would ring from a number the family did not expect); else, as
 * before, the CHAT line, only while it is on the Kapso driver with its project key (Kapso's Meta
 * proxy carries the signaling; a meta or crm chat line cannot call). Module mode: the chat role's
 * default number (its id stamps wa_calls.number_id). Read per call, like every line client, so a
 * saved change applies at once. Holds the key: never log it.
 */
export interface CallingLine {
  env: KapsoLineEnv;
  /**
   * wa_numbers.id (the calls number, or the chat number in module mode); null under legacy config.
   */
  numberId: string | null;
  /**
   * true = the dedicated calls number (its own window, permission store and template; docs/28 §10).
   */
  calls?: true;
}

export function callingLine(): CallingLine | null {
  const calls = callsNumber();
  if (calls) return calls.env ? { env: calls.env, numberId: calls.id, calls: true } : null;
  const env = lineEnvs(loadEnv()).chat;
  if (env?.provider !== 'kapso') return null;
  return { env, numberId: numbersOverlay()?.numberIds.chat ?? null };
}
