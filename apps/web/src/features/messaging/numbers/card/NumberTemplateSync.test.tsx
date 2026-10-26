import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { renderPanel } from '../numbers-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/people/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));

// «مزامنة القوالب مع هذا الرقم» (templates.manage, docs/23c decision 9): the result in a live region.

const s = t.numbers.templateSync;
const SYNC = { number_id: 'num-1', ok: true, checked_at: '2026-10-24T08:00:00Z', meta_count: 9, synced: 4, number_ids: ['num-1'] };

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
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/admin/numbers/num-1/templates/sync'));
    const status = card.getByRole('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    await waitFor(() => expect(status.textContent).toBe(s.done.replace('{{meta}}', '9').replace('{{synced}}', '4')));
  });

  it('a sync that could not read the WABA says why', async () => {
    apiSend.mockResolvedValue({ ...SYNC, ok: false, error: 'not_configured', meta_count: 0, synced: 0 });
    const card = await clickSync();
    await waitFor(() => expect(card.getByRole('status').textContent).toBe(s.failed.replace('{{error}}', s.errors.not_configured)));
  });

  it('a refused call is announced too', async () => {
    apiSend.mockRejectedValue(new ApiError(403, { message: 'forbidden' }));
    const card = await clickSync();
    await waitFor(() => expect(card.getByRole('status').textContent).toBe(s.failed.replace('{{error}}', t.numbers.errors.generic)));
  });
});
