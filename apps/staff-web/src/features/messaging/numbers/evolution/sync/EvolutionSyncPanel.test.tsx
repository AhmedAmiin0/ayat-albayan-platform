import type { EvolutionSyncView } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { NUMBERS_QUERY_KEYS } from '@/lib/settings/query-keys';
import { evolutionPart, evolutionView } from '@/features/messaging/numbers/numbers.fixture';
import { EvolutionSyncPanel } from './EvolutionSyncPanel';
import { syncView } from './sync.fixture';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const s = t.numbers.evolution.sync;
const SYNC_PATH = '/admin/numbers/num-7/evolution/sync';

type Sync = EvolutionSyncView | null;

function show(sync: Sync = syncView(), manage = true) {
  const evolution = evolutionPart({ sync });
  const view = evolutionView({ evolution });
  return renderWithClient(<EvolutionSyncPanel view={view} evolution={evolution} manage={manage} />);
}

afterEach(() => apiFetch.mockReset());

describe('«المزامنة مع Evolution» on the card', () => {
  it('says «غير متزامن» with each part in words, and asks nothing on load', () => {
    show();
    expect(screen.getByText(s.unsynced)).toBeTruthy();
    expect(screen.getByText(`${s.parts.webhook}:`)).toBeTruthy();
    expect(screen.getByText(s.states.drift)).toBeTruthy();
    expect(screen.getByText(s.states.skipped)).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('never pushed: «لم تُزامن بعد»', () => {
    show(null);
    expect(screen.getByText(s.never)).toBeTruthy();
  });

  it('«مزامنة الآن» POSTs the sync and shows its answer', async () => {
    show();
    apiFetch.mockResolvedValue(syncView({ synced: true }));
    fireEvent.click(screen.getByRole('button', { name: s.push }));
    expect(await screen.findByText(s.synced)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith(SYNC_PATH, { method: 'POST' });
  });

  it('«تحقق» only reads back (GET)', async () => {
    show();
    apiFetch.mockResolvedValue(syncView({ synced: true }));
    fireEvent.click(screen.getByRole('button', { name: s.verify }));
    expect(await screen.findByText(s.synced)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith(SYNC_PATH);
  });

  it('a refusal is said in words (502 evolution_auth)', async () => {
    show();
    apiFetch.mockRejectedValue(new ApiError(502, { code: 'evolution_auth' }));
    fireEvent.click(screen.getByRole('button', { name: s.push }));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(t.numbers.evolution.errors.evolution_auth),
    );
  });

  it('a failed push drops the earlier «متزامن» and refetches the numbers (final review 4)', async () => {
    const client = show();
    const refetch = vi.spyOn(client, 'invalidateQueries');
    apiFetch.mockResolvedValueOnce(syncView({ synced: true }));
    fireEvent.click(screen.getByRole('button', { name: s.verify }));
    expect(await screen.findByText(s.synced)).toBeTruthy();
    apiFetch.mockRejectedValueOnce(new ApiError(502, { code: 'evolution_auth' }));
    fireEvent.click(screen.getByRole('button', { name: s.push }));
    expect(await screen.findByText(s.unsynced)).toBeTruthy();
    expect(screen.queryByText(s.synced)).toBeNull();
    expect(refetch).toHaveBeenCalledWith({ queryKey: NUMBERS_QUERY_KEYS.numbers });
  });

  it('read-only: the words without the buttons', () => {
    show(syncView(), false);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText(s.unsynced)).toBeTruthy();
  });
});
