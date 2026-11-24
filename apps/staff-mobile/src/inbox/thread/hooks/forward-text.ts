import type { ForwardResult, ThreadView } from '@ab/shared';
import { formatPhone } from '@ab/core';
import { t, ltr } from '@ab/mobile-kit';
import type { ChatNoticeValue } from './chat-actions';

/** The chat's name, else its number (isolated, so an RTL line keeps its digits in order). */
export const chatName = (th: Pick<ThreadView, 'display_name' | 'phone_e164'>): string =>
  th.display_name ?? ltr(formatPhone(th.phone_e164));

export function forwardNotice(
  results: readonly ForwardResult[],
  nameOf: (phone: string) => string,
): ChatNoticeValue {
  const sent = results.filter((r) => r.sent).length;
  const details = results.flatMap((r) =>
    r.sent ? [] : [`${nameOf(r.phone)}: ${t.inbox.forward.skip[r.reason]}`],
  );
  const text = t.inbox.forward.result
    .replace('{sent}', String(sent))
    .replace('{skipped}', String(details.length));
  return details.length ? { text, details } : { text };
}

export const selectedLine = (count: number, max: number): string =>
  t.inbox.forward.selected.replace('{count}', String(count)).replace('{max}', String(max));
