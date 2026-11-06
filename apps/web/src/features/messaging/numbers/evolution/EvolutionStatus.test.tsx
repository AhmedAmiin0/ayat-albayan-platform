import type { NumberEvolutionView } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { evolutionView } from '@/features/messaging/numbers/numbers.fixture';
import { EvolutionStatus } from './EvolutionStatus';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const e = t.numbers.evolution;
const BAILEYS: NumberEvolutionView = {
  mode: 'baileys', auto_sends: false, state: 'close', state_at: null,
};

function show(evolution: NumberEvolutionView, manage = true) {
  const view = evolutionView();
  renderWithClient(<EvolutionStatus view={view} evolution={evolution} manage={manage} />);
}

afterEach(() => apiFetch.mockReset());

describe('an Evolution number on its card', () => {
  it('shows the engine and the last state, and asks nothing on load', () => {
    show(BAILEYS);
    expect(screen.getByText(e.mode.baileys)).toBeTruthy();
    expect(screen.getByText(e.state.close)).toBeTruthy();
    expect(screen.getByRole('button', { name: e.qr })).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('«افحص الاتصال» calls the state route and shows its answer', async () => {
    apiFetch.mockResolvedValue({ state: 'open', checked_at: '2026-11-05T08:00:00Z' });
    show(BAILEYS);
    fireEvent.click(screen.getByRole('button', { name: e.check }));
    expect(await screen.findByText(e.state.open)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/admin/numbers/num-7/evolution/state');
  });

  it('a failed check says so', async () => {
    apiFetch.mockRejectedValue(new ApiError(409, { code: 'evolution_not_configured' }));
    show(BAILEYS);
    fireEvent.click(screen.getByRole('button', { name: e.check }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(e.failed));
  });

  it('Cloud: the check, but no QR', () => {
    show({ ...BAILEYS, mode: 'cloud', state: null });
    expect(screen.getByText(e.state.unknown)).toBeTruthy();
    expect(screen.queryByRole('button', { name: e.qr })).toBeNull();
    expect(screen.getByRole('button', { name: e.check })).toBeTruthy();
  });

  it('read-only: the state without the buttons', () => {
    show(BAILEYS, false);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
