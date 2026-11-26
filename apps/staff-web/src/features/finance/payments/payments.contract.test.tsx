import { parseResponse } from '@ab/client-core';
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { z } from 'zod';
import { t } from '@ab/web-kit';
import { PAYMENT } from '@/features/finance/subscriptions/money-fixture';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { PaymentsPage } from './PaymentsPage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@ab/web-kit/lib/http/supabase', () => ({ supabase: {} }));

const page = (amount: unknown) => ({
  items: [{ ...PAYMENT, amount }],
  total: 1,
  page: 1,
  pageSize: 20,
  totals: [],
});

/** The real client's parse, so the page sees what a broken answer becomes. */
function answer(body: unknown) {
  apiFetch.mockImplementation(async (path: string, init: { schema: z.ZodType }) =>
    parseResponse(init.schema, body, path),
  );
}

afterEach(() => apiFetch.mockReset());

it('a payments answer that breaks the contract shows the load error, and retry reads again', async () => {
  answer(page('145'));
  renderWithClient(<PaymentsPage search={{}} onSearch={vi.fn()} />);
  expect(await screen.findByText(t.common.loadFailed, { exact: false })).toBeTruthy();
  answer(page(145));
  fireEvent.click(screen.getByRole('button', { name: t.common.retry }));
  expect(await screen.findByRole('button', { name: t.payments.amount })).toBeTruthy();
  expect(screen.queryByText(t.common.loadFailed, { exact: false })).toBeNull();
});
