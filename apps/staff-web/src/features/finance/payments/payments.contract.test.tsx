import { fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { PAYMENT } from '@/features/finance/subscriptions/money-fixture';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { PaymentsPage } from './PaymentsPage';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));
vi.mock('@ab/web-kit/lib/http/supabase', () => ({ supabase: {} }));

const page = (amount: unknown) => ({
  items: [{ ...PAYMENT, amount }],
  total: 1,
  page: 1,
  pageSize: 20,
  totals: [],
});

/** The raw answer: the call parses it with the route's schema, as the real client does. */
function answer(body: unknown) {
  mockApi.onRead(() => body);
}

afterEach(() => mockApi.reset('read'));

it('a payments answer that breaks the contract shows the load error, and retry reads again', async () => {
  answer(page('145'));
  renderWithClient(<PaymentsPage search={{}} onSearch={vi.fn()} />);
  expect(await screen.findByText(t.common.loadFailed, { exact: false })).toBeTruthy();
  answer(page(145));
  fireEvent.click(screen.getByRole('button', { name: t.common.retry }));
  expect(await screen.findByRole('button', { name: t.payments.amount })).toBeTruthy();
  expect(screen.queryByText(t.common.loadFailed, { exact: false })).toBeNull();
});
