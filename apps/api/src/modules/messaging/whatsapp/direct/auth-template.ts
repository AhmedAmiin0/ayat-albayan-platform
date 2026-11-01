import { z } from 'zod';
import { parseOrNull, SETTING_DEFAULTS } from '@ab/shared';
import type { GraphBody } from '@/modules/messaging/whatsapp/messages/wa-components';
import type { TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';

/** The first button's text, when the row's buttons start with one. */
const firstButtonText = z
  .tuple([z.looseObject({ text: z.string() })], z.unknown())
  .transform(([first]) => first.text);

const buttonText = (buttons: TemplateRow['buttons']): string | null =>
  parseOrNull(firstButtonText, buttons);

/**
 * POST /message_templates components of an AUTHENTICATION template (docs/30 §4, account_code): Meta writes
 * the text itself, so only the options go: the security line, the expiry footer and one OTP copy-code
 * button. Our row's body and URL-shaped button are the SEND shape (the code fills {{1}} and the button).
 */
export function authSubmitComponents(row: Pick<TemplateRow, 'buttons'>): GraphBody[] {
  const text = buttonText(row.buttons);
  return [
    { type: 'BODY', add_security_recommendation: true },
    { type: 'FOOTER', code_expiration_minutes: SETTING_DEFAULTS.login_code_ttl_minutes },
    { type: 'BUTTONS', buttons: [{ type: 'OTP', otp_type: 'COPY_CODE', ...(text ? { text } : {}) }] },
  ];
}
