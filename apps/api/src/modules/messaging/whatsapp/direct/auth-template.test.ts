import { describe, expect, it } from 'vitest';
import { submitPayload, templateMessage } from '../messages/wa-components';
import { templateRow } from '../whatsapp.fakes';

const ACCOUNT_CODE = templateRow({
  key: 'account_code',
  meta_name: 'account_code',
  category: 'authentication',
  body_ar: '*{{1}}* هو رمز التحقق الخاص بك.',
  footer_ar: null,
  buttons: [{ type: 'url', text: 'نسخ الرمز', url: 'https://www.whatsapp.com/otp/code/?otp_type=COPY_CODE&code=otp{{1}}' }],
});

describe('account_code: an AUTHENTICATION template (docs/30 §4)', () => {
  it('submits Meta OTP shape: security line, expiry footer, one copy-code button, no custom text', () => {
    expect(submitPayload(ACCOUNT_CODE)).toEqual({
      name: 'account_code',
      language: 'ar',
      category: 'AUTHENTICATION',
      components: [
        { type: 'BODY', add_security_recommendation: true },
        { type: 'FOOTER', code_expiration_minutes: 10 },
        { type: 'BUTTONS', buttons: [{ type: 'OTP', otp_type: 'COPY_CODE', text: 'نسخ الرمز' }] },
      ],
    });
  });

  it('sends the code in the body and as the copy-code button value', () => {
    const body = templateMessage({ to: '+966500000001', template: ACCOUNT_CODE, params: { '1': '123456', button: '123456' } });
    expect(body).toMatchObject({
      to: '966500000001',
      template: {
        name: 'account_code',
        components: [
          { type: 'body', parameters: [{ type: 'text', text: '123456' }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: '123456' }] },
        ],
      },
    });
  });

  it('a button without text still submits', () => {
    const payload = submitPayload({ ...ACCOUNT_CODE, buttons: [] });
    expect(payload.components).toContainEqual({ type: 'BUTTONS', buttons: [{ type: 'OTP', otp_type: 'COPY_CODE' }] });
  });
});
