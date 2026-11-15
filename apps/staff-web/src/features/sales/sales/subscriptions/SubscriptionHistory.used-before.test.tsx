import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { history, HISTORY_ID } from '@/features/sales/sales/academy.fixtures';
import { renderWithQuery } from '@/features/sales/sales/academy.test-utils';
import { SubscriptionHistory } from './SubscriptionHistory';

// «تعديل عدد الحلقات المستخدمة» on the student's CURRENT package (owner 2026-11-02, review B):
// the newest active one, whichever subscription the history was opened from.
const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/people/auth', async (orig) => ({
  ...(await orig<object>()),
  usePermissions: () => ({
    permissions: [],
    can: (p: string) => p === 'subscriptions.edit_terms',
  }),
}));

const e = t.salesMoney.usedBeforeEdit;
const URL = `/subscriptions/${HISTORY_ID}/lessons-used-before`;
const STATE = { subscription_id: HISTORY_ID, lessons_used_before: 0, max: 6, blocked: null };
const RESULT = {
  subscription_id: HISTORY_ID,
  lessons_total: 8,
  lessons_used_before: 1,
  lessons_used: 4,
  remaining: 4,
};

function serve(opened: string) {
  apiFetch.mockImplementation(async (path: string) =>
    path === URL ? STATE : { ...history(), subscription_id: opened },
  );
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('the history’s «تعديل عدد الحلقات المستخدمة»', () => {
  it('only on the current package, even when the history opened from the old one', async () => {
    serve('old');
    renderWithQuery(<SubscriptionHistory id="old" onClose={vi.fn()} />);
    const buttons = await screen.findAllByRole('button', { name: e.action });
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.closest('li')?.textContent).toContain('2026-09-01');
  });

  it('saves through PATCH and reads the history again', async () => {
    serve(HISTORY_ID);
    renderWithQuery(<SubscriptionHistory id={HISTORY_ID} onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: e.action }));
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.click(await dialog.findByRole('button', { name: t.salesMoney.usedBeforeMore }));
    apiSend.mockResolvedValue(RESULT);
    fireEvent.click(dialog.getByRole('button', { name: e.save }));
    await vi.waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', URL, { lessonsUsedBefore: 1 }));
    const historyReads = () => apiFetch.mock.calls.filter((c) => c[0] !== URL).length;
    await vi.waitFor(() => expect(historyReads()).toBe(2));
  });
});
