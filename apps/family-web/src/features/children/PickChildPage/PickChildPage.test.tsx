import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { home, portalApi } from '@ab/web-kit/testing';
import { renderAt } from '@/test/render-at';
import { PickChildPage } from './PickChildPage';

const apiFetch = vi.hoisted(() => vi.fn());
const pick = vi.hoisted(() => vi.fn());
const state = vi.hoisted(() => ({ now: 'choose' }));
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/features/shell', () => ({
  usePickChild: () => pick,
  useFamilyPick: () => ({ state: state.now }),
}));

const P = t.portal.app.pick;
const openName = (name: string) => t.portal.app.home.open.replace('{name}', name);

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockImplementation(portalApi());
  pick.mockReset();
  state.now = 'choose';
});

describe('PickChildPage', () => {
  it('the title and one card per child', async () => {
    renderAt(<PickChildPage home={home()} />);
    expect(await screen.findByRole('heading', { level: 1, name: P.title })).toBeTruthy();
    expect(await screen.findAllByRole('article')).toHaveLength(2);
  });

  it('the first pick shows the hint that the choice is saved', async () => {
    renderAt(<PickChildPage home={home()} />);
    expect(await screen.findByText(P.hint)).toBeTruthy();
  });

  it('a later visit (a child already picked) has no hint', async () => {
    state.now = 'one';
    renderAt(<PickChildPage home={home()} />);
    await screen.findByRole('heading', { level: 1, name: P.title });
    expect(screen.queryByText(P.hint)).toBeNull();
  });

  it('a card picks its child and goes home', async () => {
    const { router } = renderAt(<PickChildPage home={home()} />, '/children');
    fireEvent.click(await screen.findByRole('button', { name: openName('يوسف') }));
    expect(pick).toHaveBeenCalledWith('s2');
    await waitFor(() => expect(router.state.location.pathname).toBe('/portal'));
  });
});
