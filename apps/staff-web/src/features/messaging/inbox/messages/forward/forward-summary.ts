import { formatPhone, type ForwardResponse } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';

export interface ForwardSummary {
  /** «تم الإرسال: 2 · تم التخطي: 1», then one line per skipped chat: «أم سهيلة: السبب». */
  text: string;
  /** Nothing went out: the error toast. */
  tone: 'info' | 'error';
}

/** A number inside the Arabic toast line, isolated LTR (docs/07 §14.4: never «966+»). */
const ltr = (text: string): string => `\u2066${text}\u2069`;

/** The toast after a forward; `names` maps each picked number to the name the picker showed. */
export function forwardSummary(res: ForwardResponse, names: ReadonlyMap<string, string | null>): ForwardSummary {
  const sent = res.results.filter((r) => r.sent).length;
  const skipped = res.results.flatMap((r) =>
    r.sent ? [] : [`${names.get(r.phone) ?? ltr(formatPhone(r.phone))}: ${t.inbox.forward.skip[r.reason]}`],
  );
  const head = t.inbox.forward.result.replace('{sent}', String(sent)).replace('{skipped}', String(skipped.length));
  return { text: [head, ...skipped].join('\n'), tone: sent === 0 ? 'error' : 'info' };
}
