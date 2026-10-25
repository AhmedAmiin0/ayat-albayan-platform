import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { fakeClient } from './fake-client';
import { StudentLinkPage } from './StudentLinkPage';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const LESSON = {
  id: 'l-1',
  starts_at: '2026-10-05T16:00:00.000Z',
  ends_at: '2026-10-05T17:00:00.000Z',
  teacher_name: 'أبرار',
  window: { state: 'early', opens_at: '2026-10-05T15:45:00.000Z', closes_at: '2026-10-05T19:00:00.000Z' },
};
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const page = (lesson: unknown = LESSON) => json(200, { first_name: 'سهيلة', lesson });

function show() {
  const client = fakeClient();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <StudentLinkPage token="tok-1" make={() => client} />
    </QueryClientProvider>,
  );
  return client;
}

describe('StudentLinkPage /s/:token', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }));
  afterEach(() => {
    cleanup();
    fetchMock.mockReset();
    vi.useRealTimers();
  });

  it('before the window: greets, shows the next lesson and keeps «ادخل الحلقة» off', async () => {
    vi.setSystemTime(new Date('2026-10-05T15:00:00Z'));
    fetchMock.mockResolvedValue(page());
    show();
    expect(await screen.findByText(t.studentLink.page.greeting.replace('{name}', 'سهيلة'))).toBeTruthy();
    expect(screen.getByRole('heading', { name: t.studentLink.page.next })).toBeTruthy();
    expect(screen.getByText(t.studentLink.page.with.replace('{teacher}', 'أبرار'))).toBeTruthy();
    expect(screen.getByRole('button', { name: t.studentLink.page.enter })).toHaveProperty('disabled', true);
    expect(screen.getByText(t.classroom.recordedNotice)).toBeTruthy();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/public/student/tok-1');
  });

  it('during the window: joins as a guest (no name needed) and opens the room', async () => {
    vi.setSystemTime(new Date('2026-10-05T16:05:00Z'));
    fetchMock.mockResolvedValueOnce(page({ ...LESSON, window: { ...LESSON.window, state: 'open' } }));
    fetchMock.mockResolvedValueOnce(json(200, { url: 'wss://lk', token: 'g', room: 'lesson-l-1', role: 'guest' }));
    const client = show();
    expect(await screen.findByRole('heading', { name: t.studentLink.page.now })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.studentLink.page.enter }));
    await waitFor(() => expect(client.connect).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[1] ?? [];
    expect(String(url)).toContain('/public/student/tok-1/join');
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({});
  });

  it('nothing booked: says so, with no button', async () => {
    fetchMock.mockResolvedValue(page(null));
    show();
    expect(await screen.findByText(t.studentLink.page.none)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.studentLink.page.enter })).toBeNull();
  });

  it('an unknown link reads «هذا الرابط غير صحيح»', async () => {
    fetchMock.mockResolvedValue(json(404, { code: 'link_invalid' }));
    show();
    expect(await screen.findByText(t.classroom.error.link_invalid)).toBeTruthy();
  });
});
