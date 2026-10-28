import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { settingsPatch, serverProblems, type StripeDraft } from './settings-patch';

const S = t.paymentLinks.settings;
const DRAFT: StripeDraft = { enabled: true, apiKey: '', webhookSecret: '', maxDiscount: '' };

describe('«الدفع الإلكتروني (اختبار)» patch', () => {
  it('empty secrets are kept as saved; an empty cap is no cap', () => {
    expect(settingsPatch(DRAFT)).toEqual({ ok: true, patch: { enabled: true, maxDiscountPct: null } });
  });

  it('a typed test key, secret and cap are sent trimmed', () => {
    const res = settingsPatch({ enabled: false, apiKey: ' rk_test_51Ab ', webhookSecret: 'whsec_abc', maxDiscount: '10' });
    expect(res).toEqual({ ok: true, patch: { enabled: false, maxDiscountPct: 10, apiKey: 'rk_test_51Ab', webhookSecret: 'whsec_abc' } });
  });

  it('refuses a live key, a wrong secret and a cap outside 0–100 before sending', () => {
    const res = settingsPatch({ ...DRAFT, apiKey: 'sk_live_51Ab', webhookSecret: 'abc', maxDiscount: '120' });
    expect(res).toEqual({ ok: false, problems: { apiKey: S.liveRefused, webhookSecret: S.invalidSecret, maxDiscount: t.paymentLinks.web.maxDiscountRange } });
  });

  it('maps the API refusals to their field', () => {
    expect(serverProblems(new ApiError(400, { code: 'stripe_live_key_refused' }))).toEqual({ apiKey: S.liveRefused });
    expect(serverProblems(new ApiError(400, { code: 'invalid_secret' }))).toEqual({ webhookSecret: S.invalidSecret });
    expect(serverProblems(new ApiError(500, null))).toBeNull();
  });
});
