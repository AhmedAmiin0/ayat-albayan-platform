import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { renderAt } from '@/test/render-at';
import { Bell } from './Bell';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const answer = (unread: number) => apiFetch.mockResolvedValue({ items: [], unread });
const named = (n: number) => t.bell.openUnread.replace('{n}', String(n));

beforeEach(() => {
  apiFetch.mockReset();
});

describe('Bell', () => {
  it('nothing unread: the plain label and no badge', async () => {
    answer(0);
    renderAt(<Bell />);
    const bell = await screen.findByRole('link', { name: t.bell.open });
    expect(bell.getAttribute('href')).toBe('/alerts');
    expect(bell.textContent).toBe('');
  });

  it('unread rows: the count in the label and on the badge', async () => {
    answer(3);
    renderAt(<Bell />);
    expect((await screen.findByRole('link', { name: named(3) })).textContent).toBe('3');
  });

  it('more than 99: the badge says 99+', async () => {
    answer(120);
    renderAt(<Bell />);
    expect((await screen.findByRole('link', { name: named(120) })).textContent).toBe('99+');
  });
});
