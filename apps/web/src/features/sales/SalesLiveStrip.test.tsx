import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { liveLesson } from './academy.fixtures';
import { renderWithQuery } from './academy.test-utils';
import { SalesLiveStrip } from './SalesLiveStrip';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
const live = (rows: unknown[]) => apiFetch.mockImplementation(async (path: string) => (path === '/sales/live' ? rows : {}));

afterEach(() => apiFetch.mockReset());

describe('SalesLiveStrip compact (the inbox list head)', () => {
  it('renders ONE chip link with the count, to /sales/live, and no band', async () => {
    live([liveLesson(), liveLesson({ lesson_id: 'l-2' }), liveLesson({ lesson_id: 'l-3' })]);
    renderWithQuery(<SalesLiveStrip enabled compact />);
    const link = await screen.findByRole('link', { name: t.sales.live.strip.replace('{n}', '3') });
    expect(link.getAttribute('href')).toBe('/sales/live');
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.queryByText(t.sales.live.open)).toBeNull();
  });

  it('renders nothing with nothing running', async () => {
    live([]);
    const { container } = renderWithQuery(<SalesLiveStrip enabled compact />);
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/sales/live'));
    expect(container.textContent).toBe('');
  });

  it('renders nothing and fetches nothing without the scope key', () => {
    const { container } = renderWithQuery(<SalesLiveStrip enabled={false} compact />);
    expect(container.textContent).toBe('');
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
