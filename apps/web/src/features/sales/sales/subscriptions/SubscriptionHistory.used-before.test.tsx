import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { history, HISTORY_ID } from '@/features/sales/sales/academy.fixtures';
import { renderWithQuery } from '@/features/sales/sales/academy.test-utils';
import { SubscriptionHistory } from './SubscriptionHistory';

// «تعديل عدد الحلقات المستخدمة» on the assistant's current subscription (owner 2026-11-02).
const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/people/auth', async (orig) => ({
  ...(await orig<object>()),
  usePermissions: () => ({ permissions: [], can: (p: string) => p === 'subscriptions.set_start_date' }),
}));

const e = t.salesMoney.usedBeforeEdit;

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('the history card’s «تعديل عدد الحلقات المستخدمة»', () => {
  it('only on the current subscription; saves through PATCH and reads the history again', async () => {
    apiFetch.mockResolvedValue(history());
    renderWithQuery(<SubscriptionHistory id={HISTORY_ID} onClose={vi.fn()} />);
    const buttons = await screen.findAllByRole('button', { name: e.action });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0] as HTMLElement);
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.click(dialog.getByRole('button', { name: t.salesMoney.usedBeforeMore }));
    apiSend.mockResolvedValue({
      subscription_id: HISTORY_ID,
      lessons_total: 8,
      lessons_used_before: 1,
      lessons_used: 4,
      remaining: 4,
    });
    fireEvent.click(dialog.getByRole('button', { name: e.save }));
    await vi.waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith(
        'PATCH',
        `/subscriptions/${HISTORY_ID}/lessons-used-before`,
        { lessonsUsedBefore: 1 },
      ),
    );
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
  });
});
