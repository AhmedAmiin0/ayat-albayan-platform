import { waSendKind } from '@ab/shared';
import { ar } from '@/common/infra/i18n/server-text';

const LABEL_TEXT_MAX = 40;
const NAMES: Record<string, string> = ar.templates.names;

const clipped = (text: string): string =>
  text.length > LABEL_TEXT_MAX ? `${text.slice(0, LABEL_TEXT_MAX)}…` : text;

const mediaLabel = (mime: string | null | undefined): string =>
  ar.inbox.media[waSendKind(mime ?? null)];

/** The raw key when the template is unknown; the text start for a session message. */
export function messageLabel(row: {
  template_key: string | null;
  body: string | null;
  media_path?: string | null;
  media_mime?: string | null;
}): string {
  if (row.template_key) return NAMES[row.template_key] ?? row.template_key;
  const text = (row.body ?? '').trim();
  return !text && row.media_path ? mediaLabel(row.media_mime) : clipped(text);
}
