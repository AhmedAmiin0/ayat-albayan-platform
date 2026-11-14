import {
  correctionBody,
  type MessageQuote,
  type MessageView,
  type TemplateParamsInput,
  type ThreadTemplate,
} from '@ab/shared';
import bundled from '@ab/shared/i18n/ar.json';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import type { PinKind } from './pinned-send';

/**
 * What the composer sends: session text, or an approved template with its params (H3 / H4). Any
 * registry key: a producer's, or a chat starter imported from Meta (owner 2026-10-12).
 */
export type Outgoing =
  | { kind: 'text'; text: string; replyTo?: MessageQuote; correctsId?: string }
  | {
      kind: 'template';
      key: ThreadTemplate['key'];
      params: TemplateParamsInput;
      preview: string;
      lessonId?: string;
      /** «إعادة فتح المحادثة» (owner 2026-11-14): this phone's reopen template. */
      reopen?: true;
    };

/** One send of useSendMessage. */
export interface SendInput {
  out: Outgoing;
  /** The provisional row's id and the clientRequestId (rule 8: a retry returns the first row). */
  id: string;
  /** The sender that owns a pinned id after no answer: the box or «عرض سعر» (pinned-send). */
  pin?: PinKind;
}

/** How a send ended: its row (a 2xx), its error, its id. */
export interface SendDone {
  row: MessageView | undefined;
  error: unknown;
  id: string;
}

/** What the send carries: its text, or a template's preview. */
export const carried = (out: Outgoing): string => (out.kind === 'text' ? out.text : out.preview);

/**
 * The Arabic prefixes the API may put before a correction (it adds Arabic whatever the app's
 * language): the admins' wording (this run's override-merged `t`, when it is the Arabic one), then
 * the bundled default, which the API strips too.
 */
export const correctionPrefixes = (): [string, string] => {
  const fallback = bundled.inbox.correction.prefix;
  return [locale === 'ar' ? t.inbox.correction.prefix : fallback, fallback];
};

/** What the API's row will say: a correction (owner 2026-11-07) after its prefix; else the text. */
export function echoed(out: Outgoing): string {
  const [prefix, fallback] = correctionPrefixes();
  const fixes = out.kind === 'text' && out.correctsId;
  return fixes ? correctionBody(prefix, out.text, [fallback]) : carried(out);
}

/** The POST body of a text or template send, with its clientRequestId. */
export function sendBody({ out, id }: SendInput) {
  if (out.kind === 'text') {
    const reply = out.replyTo ? { replyToMessageId: out.replyTo.id } : {};
    // «تعديل» (owner 2026-11-07): the API adds the prefix and the reply to the original.
    const corrects = out.correctsId ? { correctsId: out.correctsId } : {};
    return { text: out.text, clientRequestId: id, ...reply, ...corrects };
  }
  const lesson = out.lessonId ? { lessonId: out.lessonId } : {};
  const reopen = out.reopen ? { reopen: true } : {};
  return { key: out.key, params: out.params, clientRequestId: id, ...lesson, ...reopen };
}
