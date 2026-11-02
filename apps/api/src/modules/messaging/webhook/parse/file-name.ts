import { cleanFileName } from '@ab/shared';

/**
 * A document's file name as WhatsApp (Meta or Kapso) sent it, fit for messages.media_name (its
 * check: 1–200 characters once trimmed): no control or bidi characters, at most 200 code points
 * (never half an emoji, which Postgres would refuse with the whole row), null when none is left.
 */
export function mediaFileName(raw: string | null | undefined): string | null {
  return cleanFileName(raw) || null;
}
