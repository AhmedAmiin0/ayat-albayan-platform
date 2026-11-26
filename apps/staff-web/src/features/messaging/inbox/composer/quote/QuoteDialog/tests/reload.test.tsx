import { cleanup, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { fakePricingApi } from '@/features/finance/pricing/fake-pricing-api';
import {
  isOff,
  press,
  showSheet,
} from '@/features/messaging/inbox/composer/quote/testing/quote-sheet';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const q = t.inbox.quote;
const gates = () => [q.send, q.edit, q.copy].map(isOff);
const answers = () => apiFetch.mockImplementation(async (path: string) => fakePricingApi(path));
const down = () => apiFetch.mockRejectedValue(new Error('down'));

beforeEach(answers);
afterEach(() => {
  apiFetch.mockReset();
  cleanup();
});

// A price read again in the background (the window refocused) may fail while the last answer
// still shows: that price is no longer confirmed.
it.each(['one', 'all'] as const)(
  '«%s»: a shown price whose reload fails may not leave until a reload succeeds',
  async (mode) => {
    const { client } = await showSheet();
    press(q.mode[mode]);
    await waitFor(() => expect(gates()).toEqual([false, false, false]));
    down();
    await client.refetchQueries({ type: 'active' });
    expect(await screen.findByText(t.common.error)).toBeTruthy();
    expect(screen.getByTestId('quote-text')).toBeTruthy();
    expect(gates()).toEqual([true, true, true]);
    answers();
    await client.refetchQueries({ type: 'active' });
    await waitFor(() => expect(gates()).toEqual([false, false, false]));
    expect(screen.queryByText(t.common.error)).toBeNull();
  },
);
