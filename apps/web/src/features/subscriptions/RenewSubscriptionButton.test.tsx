import { quote, STUDENT_STATUSES, type StudentStatus } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/inbox/testing/test-utils';
import { t } from '@/lib/i18n/i18n';
import { balanceOf, WEEKLY } from './money-fixture';
import { RenewSubscriptionButton } from './RenewSubscriptionButton';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const LAST = {
  ...WEEKLY,
  duration: 60 as const,
  price_source: { ...quote({ tier: 'premium', duration: 60, country: 'AE', students: 1, discount: 10 }), fx: null },
};

function renderButton(status: StudentStatus) {
  routeFetch(apiFetch, [['/students/stu-1/balance', balanceOf([LAST])]]);
  apiSend.mockResolvedValue(LAST.price_source);
  renderWithClient(<RenewSubscriptionButton student={{ id: 'stu-1', name: 'سهيلة', code: 'AB-0183', status }} />);
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('«جدّد الاشتراك» on the student profile (owner 2026-10-15)', () => {
  it.each(['pending_renewal', 'expired'] as const)('%s: shown', async (status) => {
    renderButton(status);
    expect(await screen.findByRole('button', { name: t.students.renew })).toBeTruthy();
  });

  it.each(STUDENT_STATUSES.filter((s) => s !== 'pending_renewal' && s !== 'expired'))('%s: hidden, the balance never asked', (status) => {
    renderButton(status);
    expect(screen.queryByRole('button', { name: t.students.renew })).toBeNull();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('opens «اشتراك جديد» for this student, prefilled from the last package', async () => {
    renderButton('expired');
    const button = await screen.findByRole('button', { name: t.students.renew });
    await waitFor(() => expect(button).toHaveProperty('disabled', false));
    fireEvent.click(button);
    const dialog = screen.getByRole('dialog', { name: t.subscriptions.new });
    expect(within(dialog).getByText('سهيلة')).toBeTruthy();
    expect(within(dialog).getByLabelText(t.subscriptions.package)).toHaveProperty('value', 'premium');
    expect(within(dialog).getByLabelText(t.subscriptions.duration)).toHaveProperty('value', '60');
    expect(within(dialog).getByLabelText(t.subscriptions.discount)).toHaveProperty('value', '10');
    expect(within(dialog).getByLabelText(t.subscriptions.country)).toHaveProperty('value', 'AE');
    expect(within(dialog).queryByRole('button', { name: t.common.edit })).toBeNull();
  });
});
