import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { STRIPE_SETTINGS } from './stripe-settings.fixture';
import { StripeSettingsSection } from './StripeSettingsSection';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const S = t.paymentLinks.settings;
const wait = () => new Promise((r) => setTimeout(r, 20));

describe('«الدفع الإلكتروني (اختبار)» gate', () => {
  afterEach(() => {
    apiFetch.mockReset();
    vi.unstubAllEnvs();
  });

  it('a normal build: nothing, and no request', async () => {
    apiFetch.mockResolvedValue(STRIPE_SETTINGS);
    renderWithClient(<StripeSettingsSection onSaved={vi.fn()} />);
    await wait();
    expect(screen.queryByRole('heading', { name: S.section })).toBeNull();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('the test build, but the server has no Stripe (404): nothing', async () => {
    vi.stubEnv('VITE_FEATURE_STRIPE', '1');
    apiFetch.mockRejectedValue(new ApiError(404, null));
    renderWithClient(<StripeSettingsSection onSaved={vi.fn()} />);
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/admin/stripe/settings'));
    await wait();
    expect(screen.queryByRole('heading', { name: S.section })).toBeNull();
  });

  it('both on: the section, even while the links are off; secrets only as saved / not saved', async () => {
    vi.stubEnv('VITE_FEATURE_STRIPE', '1');
    apiFetch.mockResolvedValue(STRIPE_SETTINGS);
    renderWithClient(<StripeSettingsSection onSaved={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: S.section })).toBeTruthy();
    expect((screen.getByRole('checkbox', { name: S.enabled }) as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText(S.set.replace('{masked}', 'rk_test_••••WXYZ'))).toBeTruthy();
    expect(screen.getByText(S.notSet)).toBeTruthy();
    expect((screen.getByLabelText(S.apiKey) as HTMLInputElement).type).toBe('password');
    expect((screen.getByLabelText(S.apiKey) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(S.maxDiscount) as HTMLInputElement).value).toBe('10');
    expect((screen.getByLabelText(S.webhookUrl) as HTMLInputElement).value).toBe(STRIPE_SETTINGS.webhook_url);
  });
});
