import type { WaLine } from '@ab/shared';
import { overlayNumbers } from '@/common/configuration/integrations/numbers-overlay';
import { lineEnvs, lineProvider, loadEnv } from '@/config/env/env';
import { capsOf } from '@/modules/messaging/whatsapp';
import { pickSend } from '@/modules/messaging/inbox/send/send-number';
import type { ThreadsRepo } from '@/modules/messaging/inbox/threads/threads.repo';

/** Where the chat's next session message leaves from (sendLine / pickSend): a line and/or a number. */
type ReactFrom = { line?: WaLine; number_id?: string };

/**
 * The crm driver (wacrm's public API: text, files and templates only, docs/19) has no reaction call, so
 * a chat answered from a CRM line cannot react. The env and the numbers overlay are read per call.
 * No line key = the single (notifications) line.
 */
export function sendsOnCrm(from: ReactFrom): boolean {
  const number = from.number_id ? overlayNumbers()?.find((n) => n.id === from.number_id) : null;
  if (from.number_id) return !capsOf(number?.env).reactions;
  const line = from.line ?? 'notifications';
  // An Evolution line has no reaction call of ours either (docs/19 «Evolution driver»).
  return lineProvider(loadEnv(), line) === 'crm' || !capsOf(lineEnvs(loadEnv())[line]).reactions;
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
