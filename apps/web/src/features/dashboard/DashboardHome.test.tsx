import type { ThreadView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { QuickActions } from './QuickActions';
import { RecentInbox } from './RecentInbox';
import { lessonAt } from './today-fixture';
import { TodayKpis } from './TodayKpis';
import { TodayLessons } from './TodayLessons';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('./link-mock')).Link }));

const wrap = (ui: ReactNode) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

const thread = (n: number): ThreadView =>
  ({
    phone_e164: `+96650000000${n}`,
    display_name: `ولي أمر ${n}`,
    unread_count: n === 1 ? 2 : 0,
    last_message_at: '2026-10-05T09:00:00.000Z',
    last_direction: 'inbound',
    last_body: `رسالة ${n}`,
  }) as ThreadView;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-05T10:00:00.000Z'));
});
afterEach(() => {
  vi.useRealTimers();
  apiFetch.mockReset();
});

describe('TodayKpis', () => {
  it('shows bars while loading, then the numbers; saffron only where there is work', () => {
    const { rerender, container } = render(<TodayKpis today={undefined} needsConfirmation={undefined} unpaid={undefined} />);
    expect(container.querySelectorAll('.animate-shimmer')).toHaveLength(4);
    rerender(<TodayKpis today={{ lessons: 5, live: 1 }} needsConfirmation={2} unpaid={0} />);
    expect(screen.getByRole('link', { name: `${t.dashboard.home.lessonsToday} 5` }).getAttribute('href')).toBe('/admin/classrooms');
    expect(screen.getByText('2').className).toContain('text-act');
    expect(screen.getByText('0').className).not.toContain('text-act');
  });
});

describe('TodayLessons', () => {
  it('lists today by time with the teacher, a status chip and a live mark on an open room', () => {
    wrap(
      <TodayLessons
        lessons={[
          lessonAt({ id: 'b', startsAt: '2026-10-05T15:00:00.000Z', student: 'يوسف' }),
          lessonAt({ id: 'a', startsAt: '2026-10-05T09:50:00.000Z', student: 'سارة' }),
        ]}
      />,
    );
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items[0]?.textContent).toContain('سارة');
    expect(items[0]?.textContent).toContain(t.dashboard.home.live);
    expect(items[1]?.textContent).not.toContain(t.dashboard.home.live);
    expect(items[0]?.textContent).toContain(t.dashboard.home.teacher.replace('{name}', 'أبرار'));
    expect(screen.getAllByRole('button', { name: t.classroom.enter }).length).toBeGreaterThan(0);
  });

  it('says there is nothing today, and shows bars while loading', () => {
    const { rerender, container } = wrap(<TodayLessons lessons={undefined} />);
    expect(container.querySelector('[aria-busy=true]')).toBeTruthy();
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <TodayLessons lessons={[]} />
      </QueryClientProvider>,
    );
    expect(screen.getByText(t.dashboard.home.todayEmpty)).toBeTruthy();
  });
});

describe('RecentInbox', () => {
  it('the newest five threads, each opening in the inbox, unread in bold', async () => {
    apiFetch.mockResolvedValue({ items: [1, 2, 3, 4, 5, 6, 7].map(thread), total: 7, page: 1, pageSize: 30 });
    wrap(<RecentInbox />);
    const first = await screen.findByRole('link', { name: t.inbox.openThread.replace('{name}', 'ولي أمر 1') });
    expect(first.getAttribute('href')).toBe('/admin/inbox?page=1&phone=%2B966500000001');
    expect(screen.getAllByRole('link', { name: /ولي أمر/ })).toHaveLength(5);
    expect(screen.getByText('ولي أمر 1').className).toContain('font-bold');
  });

  it('an empty inbox says so', async () => {
    apiFetch.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 30 });
    wrap(<RecentInbox />);
    expect(await screen.findByText(t.dashboard.home.inboxEmpty)).toBeTruthy();
  });
});

describe('QuickActions', () => {
  it('new meeting, add a student (the dialog opens here) and book a lesson', () => {
    apiFetch.mockResolvedValue([]);
    wrap(<QuickActions />);
    const group = screen.getByRole('group', { name: t.dashboard.home.quick });
    expect(within(group).getByText(t.meetings.new)).toBeTruthy();
    expect(within(group).getByRole('link', { name: t.dashboard.home.book }).getAttribute('href')).toBe('/admin/book');
    fireEvent.click(within(group).getByRole('button', { name: t.dashboard.home.addStudent }));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
