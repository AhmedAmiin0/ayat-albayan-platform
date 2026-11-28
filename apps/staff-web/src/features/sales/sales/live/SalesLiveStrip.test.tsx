import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { liveLesson } from '@/features/sales/sales/academy.fixtures';
import { renderWithQuery } from '@/features/sales/sales/academy.test-utils';
import { SalesLiveStrip } from './SalesLiveStrip';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));
// The router's Link (a client-side move keeps the drafts); a plain <a href> would reload the page.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) => (
    <a data-router-link="" href={to} {...rest}>
      {children}
    </a>
  ),
}));
const live = (rows: unknown[]) =>
  mockApi.onRead(async ({ path }) => (path === '/sales/live' ? rows : {}));

afterEach(() => mockApi.reset('read'));

describe('SalesLiveStrip compact (the inbox list head)', () => {
  it('renders ONE chip link with the count, to /sales/live, and no band', async () => {
    live([liveLesson(), liveLesson({ lesson_id: 'l-2' }), liveLesson({ lesson_id: 'l-3' })]);
    renderWithQuery(<SalesLiveStrip enabled compact />);
    const link = await screen.findByRole('link', { name: t.sales.live.strip.replace('{n}', '3') });
    expect(link.getAttribute('href')).toBe('/sales/live');
    expect(link.hasAttribute('data-router-link')).toBe(true);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.queryByText(t.sales.live.open)).toBeNull();
  });

  it('renders nothing with nothing running', async () => {
    live([]);
    const { container } = renderWithQuery(<SalesLiveStrip enabled compact />);
    await vi.waitFor(() =>
      expect(mockApi.reads()).toContainEqual({ method: 'GET', path: '/sales/live' }),
    );
    expect(container.textContent).toBe('');
  });

  it('renders nothing and fetches nothing without the scope key', () => {
    const { container } = renderWithQuery(<SalesLiveStrip enabled={false} compact />);
    expect(container.textContent).toBe('');
    expect(mockApi.reads()).toHaveLength(0);
  });
});
