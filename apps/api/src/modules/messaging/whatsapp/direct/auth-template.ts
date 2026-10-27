import { SETTING_DEFAULTS } from '@ab/shared';
import type { GraphBody } from '../messages/wa-components';
import type { TemplateRow } from '../whatsapp.types';

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

function buttonText(buttons: TemplateRow['buttons']): string | null {
  const first: unknown = Array.isArray(buttons) ? buttons[0] : null;
  if (!first || typeof first !== 'object' || !('text' in first)) return null;
  return typeof first.text === 'string' ? first.text : null;
}
