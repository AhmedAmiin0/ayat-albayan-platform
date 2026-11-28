import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, t } from '@ab/web-kit';
import { renderPanel } from '@/features/messaging/numbers/numbers-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@ab/web-kit/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));

// docs/23c decision 9: the result goes in a live region.

const s = t.numbers.templateSync;
const SYNCED_ID = '6f1c2a40-0b7e-4c2f-9d1a-3e5b7c9d1f20';
const SYNC = {
  number_id: SYNCED_ID,
  ok: true,
  checked_at: '2026-10-24T08:00:00Z',
  meta_count: 9,
  synced: 4,
  number_ids: [SYNCED_ID],
};

async function clickSync() {
  renderPanel(apiFetch);
  const card = within(await screen.findByRole('article', { name: 'Notifications line' }));
  fireEvent.click(card.getByRole('button', { name: s.button }));
  return card;
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('a number’s template sync', () => {
  it('POSTs the per-number sync and announces what it found', async () => {
    apiSend.mockResolvedValue(SYNC);
    const card = await clickSync();
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/admin/numbers/num-1/templates/sync', undefined));
    const status = card.getByRole('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    await waitFor(() => expect(status.textContent).toBe(s.done.replace('{{meta}}', '9').replace('{{synced}}', '4')));
  });

  it('a sync that could not read the WABA says why', async () => {
    apiSend.mockResolvedValue({ ...SYNC, ok: false, error: 'not_configured', meta_count: 0, synced: 0 });
    const card = await clickSync();
    await waitFor(() => expect(card.getByRole('status').textContent).toBe(s.failed.replace('{{error}}', s.errors.not_configured)));
  });

  it('a refused call is announced in words, never «حدث خطأ»', async () => {
    const code = 'module_mode_only';
    apiSend.mockRejectedValue(new ApiError(409, { code, message: code }));
    const card = await clickSync();
    const text = s.failed.replace('{{error}}', s.errors.module_mode_only);
    await waitFor(() => expect(card.getByRole('status').textContent).toBe(text));
  });
});
