import type { WaLine } from '@ab/shared';
import { overlayNumbers } from '@/common/configuration/integrations/numbers-overlay';
import { lineEnvs, lineProvider, loadEnv } from '@/config/env/env';
import { capsOf } from '@/modules/messaging/whatsapp';
import { pickSend } from '@/modules/messaging/inbox/send/send-number';
import type { ThreadsRepo } from '@/modules/messaging/inbox/threads/threads.repo';

/** Where the chat's next session message leaves from (sendLine / pickSend): a line and/or a number. */
type ReactFrom = { line?: WaLine; number_id?: string };

/** A number: its own driver's capability. */
const numberReacts = (id: string): boolean =>
  capsOf(overlayNumbers()?.find((n) => n.id === id)?.env).reactions;

/** A line (no key = the single notifications line): a crm line never, even half-configured. */
function lineReacts(line: WaLine = 'notifications'): boolean {
  const env = loadEnv();
  return lineProvider(env, line) !== 'crm' && capsOf(lineEnvs(env)[line]).reactions;
}

/**
 * The crm driver (wacrm's public API: text, files and templates only, docs/19) has no reaction
 * call, nor does Evolution, so a chat answered from such a line cannot react (driver-caps).
 * The env and the numbers overlay are read per call.
 */
export function sendsOnCrm(from: ReactFrom): boolean {
  return from.number_id ? !numberReacts(from.number_id) : !lineReacts(from.line);
}

/**
 * The thread page's `reactable` flag: its 24 h window is open and the line it answers from is not the CRM's.
 * Never throws (a failed windows read reads as not reactable): the apps only hide the row.
 */
export async function threadReactable(queries: ThreadsRepo, phone: string, now: Date): Promise<boolean> {
  const thread = await queries.thread(phone).catch(() => null);
  if (!thread) return false;
  const picked = await pickSend({ thread, now, windows: () => queries.numberWindows(phone) }).catch(() => null);
  return picked !== null && !('code' in picked) && !sendsOnCrm(picked);
}
