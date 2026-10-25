import type { WaLine } from '@ab/shared';
import { lineEnvs, loadEnv } from '../../../config/env/env';
import { threadReplyLine, type ThreadRow } from '../threads/threads.mapper';

export type SendLineCode = 'session_closed' | 'line_not_configured' | 'no_thread';

/**
 * The line a session text leaves from (docs/12 §13.3 rule 2), without throwing: replyLine() prefers
 * the chat line whenever its window is open. No thread or every window closed → session_closed /
 * no_thread; only the chat window open while the chat line cannot send → line_not_configured.
 * Stamped only while the chat line is configured (13.2: a single line queues no line key). The env
 * is read per call. ThreadSendService.text turns a code into 409 / 503; the meeting invitations
 * (R-MEET-02) record it on the invitee instead.
 */
export function pickSendLine(thread: ThreadRow | null, now: Date): { line?: WaLine } | { code: SendLineCode } {
  if (!thread) return { code: 'no_thread' };
  const chatConfigured = Boolean(lineEnvs(loadEnv()).chat);
  const line = threadReplyLine(thread, { chatConfigured, now });
  if (!line) return { code: 'session_closed' };
  if (!chatConfigured) return line === 'chat' ? { code: 'line_not_configured' } : {};
  return { line };
}
