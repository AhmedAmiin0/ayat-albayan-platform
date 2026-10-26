import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { CreateSubscriptionDialog } from './CreateSubscriptionDialog';
import { WEEKLY } from '../money-fixture';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiSend }));

const posts = () => apiSend.mock.calls.filter((c) => c[1] === '/subscriptions').map((c) => c[2] as { clientRequestId: string });

describe('CreateSubscriptionDialog retries (rule 8: never two packages for one save)', () => {
  it('a retry after a failed reply re-sends the same key; a changed day gets a new one', async () => {
    let fail = true;
    apiSend.mockImplementation(async (_m: string, path: string) => {
      if (path === '/subscriptions/quote') return WEEKLY.price_source;
      if (fail) throw new Error('502 from the proxy, the row may exist');
      return WEEKLY;
    });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <CreateSubscriptionDialog student={{ id: 'stu-1', name: 'سهيلة', code: 'AB-0183' }} onClose={vi.fn()} onSaved={vi.fn()} />
      </QueryClientProvider>,
    );
    const dialog = await screen.findByRole('dialog', { name: t.subscriptions.new });
    const save = () => fireEvent.click(within(dialog).getByRole('button', { name: t.common.save }));
    save();
    await vi.waitFor(() => expect(posts()).toHaveLength(1));
    await within(dialog).findByRole('alert');
    save();
    await vi.waitFor(() => expect(posts()).toHaveLength(2));
    const [first, retry] = posts();
    expect(first?.clientRequestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(retry?.clientRequestId).toBe(first?.clientRequestId);

    fail = false;
    fireEvent.change(within(dialog).getByLabelText(t.subscriptions.startsOn), { target: { value: '2026-11-01' } });
    save();
    await vi.waitFor(() => expect(posts()).toHaveLength(3));
    expect(posts()[2]?.clientRequestId).not.toBe(first?.clientRequestId);
  });
});
