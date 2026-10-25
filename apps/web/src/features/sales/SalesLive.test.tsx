import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { liveLesson } from './academy.fixtures';
import { renderWithQuery } from './academy.test-utils';
import { SalesLive } from './SalesLive';
import { SalesLiveStrip } from './SalesLiveStrip';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
const live = (rows: unknown[]) => apiFetch.mockImplementation(async (path: string) => (path === '/sales/live' ? rows : {}));

afterEach(() => apiFetch.mockReset());

describe('SalesLive «الحلقات الجارية»', () => {
  it('lists the running lessons with students, teacher and an open «ادخل الحلقة» link', async () => {
    live([liveLesson()]);
    renderWithQuery(<SalesLive />);
    expect(await screen.findByText(/سهيلة، جود/)).toBeTruthy();
    expect(screen.getByText(/أبرار/)).toBeTruthy();
    expect(screen.getByRole('link', { name: t.classroom.enter }).getAttribute('href')).toBe('/classroom/l-live');
    expect(apiFetch).toHaveBeenCalledWith('/sales/live');
  });

  it('says when nothing is running', async () => {
    live([]);
    renderWithQuery(<SalesLive />);
    expect(await screen.findByText(t.sales.live.empty)).toBeTruthy();
  });
});

describe('SalesLiveStrip (the block on the sales landing)', () => {
  it('shows the count and links to /sales/live', async () => {
    live([liveLesson(), liveLesson({ lesson_id: 'l-2' })]);
    renderWithQuery(<SalesLiveStrip enabled />);
    expect(await screen.findByText(t.sales.live.strip.replace('{n}', '2'))).toBeTruthy();
    expect(screen.getByRole('link', { name: t.sales.live.open }).getAttribute('href')).toBe('/sales/live');
  });

  it('renders nothing without the scope key (no request) or with nothing running', async () => {
    const { container } = renderWithQuery(<SalesLiveStrip enabled={false} />);
    expect(container.textContent).toBe('');
    expect(apiFetch).not.toHaveBeenCalled();
    live([]);
    const empty = renderWithQuery(<SalesLiveStrip enabled />);
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(empty.container.textContent).toBe('');
  });
});
