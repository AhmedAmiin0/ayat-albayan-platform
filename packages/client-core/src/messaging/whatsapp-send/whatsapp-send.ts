// «أرسل عبر واتساب» (owner 2026-11-06): the link that opens the family's chat in WhatsApp with the
// text filled in, and the order of the two steps. Web opens WhatsApp Web (never the Windows app,
// which coexistence does not support); mobile opens wa.me, where Android lets staff pick WhatsApp
// Business (the academy number's linked device).

/** Where WhatsApp opens: WhatsApp Web in a browser tab, or the app on a phone. */
export type WhatsAppTarget = 'web' | 'mobile';

type LinkOf = (digits: string, text: string) => string;

const LINKS: Record<WhatsAppTarget, LinkOf> = {
  web: (digits, text) => `https://web.whatsapp.com/send?phone=${digits}&text=${text}`,
  mobile: (digits, text) => `https://wa.me/${digits}?text=${text}`,
};

/** E.164 without the + (and anything else that is not a digit): «+966501234567» → «966501234567». */
export const whatsappDigits = (e164: string): string => e164.replace(/\D/g, '');

/** The family's chat with `text` filled in (any script, line breaks and emoji, URL-encoded). */
export function whatsappSendUrl(target: WhatsAppTarget, to: { phone: string; text: string }): string {
  return LINKS[target](whatsappDigits(to.phone), encodeURIComponent(to.text));
}

/** The two steps: mark it sent from WhatsApp on the server, then open WhatsApp. */
interface WhatsAppSendSteps<R> {
  /** POST /messages/:id/sent-manually; throws when the server refused (nothing is opened). */
  mark: () => Promise<R>;
  /** Opens WhatsApp; false or a throw = it did not open. */
  open: () => Promise<boolean> | boolean;
}

/** What happened: the marked row, and whether WhatsApp opened (false: offer «تراجع»). */
export interface WhatsAppSendResult<R> {
  row: R;
  opened: boolean;
}

/**
 * Marks first, so the platform can never send the text too (no duplicate), and opens WhatsApp
 * only once the server agreed. A refused mark throws and opens nothing.
 */
export async function sendViaWhatsApp<R>(steps: WhatsAppSendSteps<R>): Promise<WhatsAppSendResult<R>> {
  const row = await steps.mark();
  try {
    return { row, opened: await steps.open() };
  } catch {
    return { row, opened: false };
  }
}
