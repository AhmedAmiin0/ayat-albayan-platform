import { formatPhone, type ForwardResult, type ThreadView } from '@ab/shared';
import { t } from '@/lib/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';
import type { ChatNoticeValue } from './chat-actions';

// The words of «إعادة توجيه» (owner 2026-10-25): a picked chat's name, and what the forward did.

/** The chat's name, else its number (isolated, so an RTL line keeps its digits in order). */
export const chatName = (th: Pick<ThreadView, 'display_name' | 'phone_e164'>): string =>
  th.display_name ?? ltr(formatPhone(th.phone_e164));

/** «تم الإرسال: 2 · تم التخطي: 1», then each skipped chat and why (the send path's own reason). */
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

/** «المختار: 2 من 5». */
export const selectedLine = (count: number, max: number): string =>
  t.inbox.forward.selected.replace('{count}', String(count)).replace('{max}', String(max));
