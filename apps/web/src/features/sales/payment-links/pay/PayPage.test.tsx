import type { PublicPaymentLink } from '@ab/shared';
import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { PayPage } from './PayPage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const P = t.paymentLinks.pay;
const LINK: PublicPaymentLink = { status: 'open', first_name: 'أم سهيلة', amount: 261, currency: 'SAR', package: '8', lessons: 8 };

const show = (link: Partial<PublicPaymentLink>, back = {}) => {
  apiFetch.mockResolvedValue({ ...LINK, ...link });
  renderWithClient(<PayPage token="tok_1" back={back} />);
};

describe('/pay/:token «الدفع» (public, no login)', () => {
  afterEach(() => apiFetch.mockReset());

  it('an open link: the greeting, amount, lessons, the test notice and «ادفع الآن» to the API checkout', async () => {
    show({});
    expect(await screen.findByText(P.greeting.replace('{name}', 'أم سهيلة'))).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/pay/tok_1', { headers: { Accept: 'application/json' } });
    expect(screen.getByRole('heading', { level: 1, name: P.title })).toBeTruthy();
    expect(screen.getByText(P.amount.replace('{amount}', '261').replace('{currency}', 'ر.س'))).toBeTruthy();
    expect(screen.getByText(t.paymentLinks.lessons.replace('{count}', '8'))).toBeTruthy();
    expect(screen.getByText(P.testNotice)).toBeTruthy();
    expect(screen.getByRole('link', { name: P.button }).getAttribute('href')).toBe('http://api.test/pay/tok_1/checkout');
  });

  it('back from Stripe: ?done=1 thanks with no second button; ?cancelled=1 says so and keeps it', async () => {
    show({}, { done: true });
    expect(await screen.findByText(P.thanks)).toBeTruthy();
    expect(screen.queryByRole('link', { name: P.button })).toBeNull();
  });

  it('?cancelled=1 keeps «ادفع الآن»', async () => {
    show({}, { cancelled: true });
    expect(await screen.findByText(P.back)).toBeTruthy();
    expect(screen.getByRole('link', { name: P.button })).toBeTruthy();
  });

  it.each([
    ['paid', P.paid],
    ['expired', P.expired],
    ['cancelled', P.cancelled],
    ['processing', P.processing],
  ] as const)('%s: its line and no button', async (status, line) => {
    show({ status });
    expect(await screen.findByText(line)).toBeTruthy();
    expect(screen.queryByRole('link', { name: P.button })).toBeNull();
  });

  it('a wrong token (404): «هذا الرابط غير صحيح»', async () => {
    apiFetch.mockRejectedValue(new ApiError(404, { code: 'link_not_found' }));
    renderWithClient(<PayPage token="nope" back={{}} />);
    expect(await screen.findByText(P.notFound)).toBeTruthy();
  });
});
