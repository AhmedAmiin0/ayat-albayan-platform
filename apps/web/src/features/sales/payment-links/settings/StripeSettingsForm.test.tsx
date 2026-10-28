import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { STRIPE_SETTINGS } from './stripe-settings.fixture';
import { StripeSettingsForm } from './StripeSettingsForm';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

const S = t.paymentLinks.settings;
const onSaved = vi.fn();
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const save = () => fireEvent.click(screen.getByRole('button', { name: S.save }));

describe('«الدفع الإلكتروني (اختبار)» form', () => {
  beforeEach(() => renderWithClient(<StripeSettingsForm settings={STRIPE_SETTINGS} onSaved={onSaved} />));
  afterEach(() => {
    apiSend.mockReset();
    onSaved.mockReset();
  });

  it('refuses a live key before anything leaves', () => {
    type(S.apiKey, 'rk_live_51Abc');
    save();
    expect(screen.getByText(S.liveRefused)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('refuses a webhook secret that is not whsec_', () => {
    type(S.webhookSecret, 'secret');
    save();
    expect(screen.getByText(S.invalidSecret)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('saves the switch, a test key and an empty cap (null) in one PATCH, then empties the key', async () => {
    apiSend.mockResolvedValue({ ...STRIPE_SETTINGS, enabled: true, max_discount_pct: null });
    fireEvent.click(screen.getByRole('checkbox', { name: S.enabled }));
    type(S.apiKey, 'rk_test_51Abc');
    type(S.maxDiscount, '');
    save();
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/admin/stripe/settings', { enabled: true, maxDiscountPct: null, apiKey: 'rk_test_51Abc' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(S.saved));
    expect((screen.getByLabelText(S.apiKey) as HTMLInputElement).value).toBe('');
  });

  it('«حذف» clears the saved key with null', async () => {
    apiSend.mockResolvedValue({ ...STRIPE_SETTINGS, api_key: { set: false, masked: null, updated_at: null } });
    fireEvent.click(screen.getByRole('button', { name: `${S.clear} — ${S.apiKey}` }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/admin/stripe/settings', { apiKey: null }));
  });

  it('the API refusing a live key shows it under the key', async () => {
    apiSend.mockRejectedValue(new ApiError(400, { code: 'stripe_live_key_refused' }));
    type(S.apiKey, 'sk_test_51Abc');
    save();
    expect(await screen.findByText(S.liveRefused)).toBeTruthy();
  });
});
