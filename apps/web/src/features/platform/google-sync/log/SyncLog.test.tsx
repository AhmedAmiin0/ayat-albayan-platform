import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { googleItems } from '@/features/platform/google-sync/google.fixture';
import { renderGoogle } from '@/features/platform/google-sync/google-test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const s = t.googleSync.log;
/** A lazy rejection: routeFetch's async answer adopts it when the log asks. */
const failing = { then: (_ok: unknown, fail: (e: Error) => void) => fail(new Error('down')) };
const rowOf = async (subject: string) => (await screen.findByText(subject)).closest('li') as HTMLElement;

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('sync log', () => {
  it('each item: kind, state, error / skip reason / planned request, attempts', async () => {
    renderGoogle({ apiFetch });
    const failed = await rowOf('Student One 2026-10-22');
    expect(within(failed).getByText(s.kind.teacher_event)).toBeTruthy();
    expect(within(failed).getByText(s.state.failed)).toBeTruthy();
    expect(within(failed).getByText(/HTTP 500/)).toBeTruthy();
    expect(within(failed).getByText(s.attempts.replace('{n}', '1'))).toBeTruthy();
    const skipped = await rowOf('Student Two 2026-10-23');
    expect(within(skipped).getByText(s.skip.dry_run)).toBeTruthy();
    expect(within(skipped).getByText('POST calendar/main')).toBeTruthy();
    const synced = await rowOf('Student One 2026-10-21');
    expect(within(synced).queryByRole('button', { name: s.retry })).toBeNull();
  });

  it('«إعادة المحاولة» posts the retry and reloads the log', async () => {
    const onNote = vi.fn();
    renderGoogle({ apiFetch, onNote });
    const row = await rowOf('Student One 2026-10-22');
    apiSend.mockResolvedValue({ ...googleItems()[0], state: 'pending' });
    fireEvent.click(within(row).getByRole('button', { name: s.retry }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/admin/google/items/item-1/retry'));
    await waitFor(() => expect(onNote).toHaveBeenCalledWith(s.retried));
    await waitFor(() => expect(apiFetch.mock.calls.filter(([p]) => p === '/admin/google/items')).toHaveLength(2));
  });

  it('«زامن الآن» says how many were queued', async () => {
    const onNote = vi.fn();
    renderGoogle({ apiFetch, onNote });
    await rowOf('Student One 2026-10-22');
    apiSend.mockResolvedValue({ queued: 4 });
    fireEvent.click(screen.getByRole('button', { name: s.reconcile }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/admin/google/reconcile'));
    await waitFor(() => expect(onNote).toHaveBeenCalledWith(s.reconciled.replace('{n}', '4')));
  });

  it('shows the counts summary, the known gap, and the empty state', async () => {
    renderGoogle({ apiFetch, routes: [['/admin/google/items', []]] });
    expect(await screen.findByText(s.empty)).toBeTruthy();
    expect(screen.getByText(t.googleSync.counts.title)).toBeTruthy();
    expect(screen.getByRole('note').textContent).toBe(t.googleSync.gap);
  });

  it('a failed log load offers a retry', async () => {
    renderGoogle({ apiFetch, routes: [['/admin/google/items', failing]] });
    const retry = await screen.findAllByRole('button', { name: t.googleSync.retry });
    expect(retry.length).toBeGreaterThan(0);
  });
});
