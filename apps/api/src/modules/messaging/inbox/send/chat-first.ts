import {
  overlayNumbers,
  type OverlayNumber,
} from '@/common/configuration/integrations/numbers-overlay';
import { lineEnvs, loadEnv } from '@/config/env/env';
import type { ThreadRow } from '@/modules/messaging/inbox/threads/threads.mapper';
import { pickSend, type SendPick, type SendPickInput, type ThreadWindow } from './send-number';

// Staff sends from a chat leave from the chat line (every driver): an inbound
// on the notifications line (a family writing to the notifications number, mirrored from the CRM)
// never opens a window a staff text, file or forward leaves from. With no chat line at all (a
// single line) the notifications window still answers, as before.

/** The chat line can send: legacy WA_CHAT_*, module mode a sendable chat number. */
function hasChat(numbers: readonly OverlayNumber[] | null): boolean {
  const sendableChat = (n: OverlayNumber) => n.purpose === 'chat' && n.enabled && n.env !== null;
  return numbers === null ? Boolean(lineEnvs(loadEnv()).chat) : numbers.some(sendableChat);
}

/** The window's line: its number's purpose when stamped, else the row's own line. */
const lineOf =
  (numbers: readonly OverlayNumber[]) =>
  (w: ThreadWindow): string => {
    const n = numbers.find((x) => x.id === w.numberId);
    return n?.purpose ?? w.line;
  };

/** The windows a staff send may use: every one but the notifications line's. */
const chatWindows = (numbers: readonly OverlayNumber[]) => (rows: readonly ThreadWindow[]) =>
  rows.filter((w) => lineOf(numbers)(w) !== 'notifications');

const withoutNotifications = (thread: ThreadRow | null): ThreadRow | null =>
  thread && { ...thread, last_notifications_inbound_at: null };

/** pickSend for a staff send from a chat: the notifications window counts only on a single line. */
export async function pickStaffSend(input: SendPickInput): Promise<SendPick> {
  const numbers = overlayNumbers();
  if (!hasChat(numbers)) return pickSend(input);
  const keep = chatWindows(numbers ?? []);
  const windows = async () => keep(await input.windows());
  return pickSend({ ...input, thread: withoutNotifications(input.thread), windows });
}
