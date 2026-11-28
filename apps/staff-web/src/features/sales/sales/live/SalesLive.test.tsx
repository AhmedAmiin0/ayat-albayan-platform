import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { liveLesson } from '@/features/sales/sales/academy.fixtures';
import { renderWithQuery } from '@/features/sales/sales/academy.test-utils';
import { SalesLive } from './SalesLive';
import { SalesLiveStrip } from './SalesLiveStrip';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));
const live = (rows: unknown[]) =>
  mockApi.onRead(async ({ path }) => (path === '/sales/live' ? rows : {}));

afterEach(() => mockApi.reset('read'));

describe('SalesLive «الحلقات الجارية»', () => {
  it('lists the running lessons with students, teacher and an open «ادخل الحلقة» link', async () => {
    live([liveLesson()]);
    renderWithQuery(<SalesLive />);
    expect(await screen.findByText(/سهيلة، جود/)).toBeTruthy();
    expect(screen.getByText(/أبرار/)).toBeTruthy();
    expect(screen.getByRole('link', { name: t.classroom.enter }).getAttribute('href')).toBe(
      '/classroom/l-live',
    );
    expect(mockApi.reads()).toContainEqual({ method: 'GET', path: '/sales/live' });
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
    expect(screen.getByRole('link', { name: t.sales.live.open }).getAttribute('href')).toBe(
      '/sales/live',
    );
  });

  it('renders nothing without the scope key (no request) or with nothing running', async () => {
    const { container } = renderWithQuery(<SalesLiveStrip enabled={false} />);
    expect(container.textContent).toBe('');
    expect(mockApi.reads()).toHaveLength(0);
    live([]);
    const empty = renderWithQuery(<SalesLiveStrip enabled />);
    await vi.waitFor(() => expect(mockApi.reads()).not.toHaveLength(0));
    expect(empty.container.textContent).toBe('');
  });
});
