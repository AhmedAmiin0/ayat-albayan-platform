/** messages.media_name's check: 1–200 characters once trimmed. */
const MAX = 200;

/**
 * A document's file name as WhatsApp (Meta or Kapso) sent it, fit for messages.media_name: trimmed,
 * at most 200 characters, null when there is none. The chat shows it on the PDF card, as WhatsApp
 * does.
 */
export function mediaFileName(raw: string | null | undefined): string | null {
  const name = (raw ?? '').trim().slice(0, MAX).trim();
  return name.length > 0 ? name : null;
}
