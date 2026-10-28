import { describe, expect, it } from 'vitest';
import { ApiError, stripeDraftOf, stripeProblemText, stripeServerProblems, stripeSettingsPatch, type StripeDraft } from '../index.js';

const DRAFT: StripeDraft = { enabled: true, apiKey: '', webhookSecret: '', maxDiscount: '' };
const secret = { set: false, masked: null, updated_at: null };

describe('«الدفع الإلكتروني (اختبار)» patch', () => {
  it('the draft of the saved settings: secrets never prefilled', () => {
    const saved = { enabled: true, max_discount_pct: 15, api_key: secret, webhook_secret: secret, webhook_url: 'https://api.x/webhooks/stripe' };
    expect(stripeDraftOf(saved)).toEqual({ enabled: true, apiKey: '', webhookSecret: '', maxDiscount: '15' });
    expect(stripeDraftOf({ ...saved, max_discount_pct: null }).maxDiscount).toBe('');
  });

  it('empty secrets are kept as saved; an empty cap is no cap', () => {
    expect(stripeSettingsPatch(DRAFT)).toEqual({ ok: true, patch: { enabled: true, maxDiscountPct: null } });
  });

  it('a typed test key, secret and cap are sent trimmed', () => {
    const res = stripeSettingsPatch({ enabled: false, apiKey: ' rk_test_51Ab ', webhookSecret: 'whsec_abc', maxDiscount: '10' });
    expect(res).toEqual({ ok: true, patch: { enabled: false, maxDiscountPct: 10, apiKey: 'rk_test_51Ab', webhookSecret: 'whsec_abc' } });
  });

  it('refuses a live key, a wrong secret and a cap outside 0–100 before sending', () => {
    const res = stripeSettingsPatch({ ...DRAFT, apiKey: 'sk_live_51Ab', webhookSecret: 'abc', maxDiscount: '120' });
    expect(res).toEqual({ ok: false, problems: { apiKey: 'liveRefused', webhookSecret: 'invalidSecret', maxDiscount: 'maxDiscountRange' } });
  });

  it('maps the API refusals to their field', () => {
    expect(stripeServerProblems(new ApiError(400, { code: 'stripe_live_key_refused' }))).toEqual({ apiKey: 'liveRefused' });
    expect(stripeServerProblems(new ApiError(400, { code: 'invalid_secret' }))).toEqual({ webhookSecret: 'invalidSecret' });
    expect(stripeServerProblems(new ApiError(500, null))).toBeNull();
    expect(stripeServerProblems(new Error('x'))).toBeNull();
  });

  it('a problem key reads the app texts', () => {
    const texts = { settings: { liveRefused: 'L', invalidSecret: 'I' }, web: { maxDiscountRange: 'M' } };
    expect([stripeProblemText('liveRefused', texts), stripeProblemText('invalidSecret', texts), stripeProblemText('maxDiscountRange', texts)]).toEqual(['L', 'I', 'M']);
  });
});
