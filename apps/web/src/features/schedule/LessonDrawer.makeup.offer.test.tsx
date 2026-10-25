import type { LessonView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { JOUD, lesson, SUHAILA } from './lesson-fixture';
import { LessonDrawer } from './LessonDrawer';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => undefined,
  Link: ({ to, search, children }: { to: string; search: Record<string, string>; children: ReactNode }) => (
    <a href={`${to}?${new URLSearchParams(search)}`}>{children}</a>
  ),
}));

const recently = () => new Date(Date.now() - 2 * 86_400_000).toISOString();
const BOOKED = { lesson_id: 'm-1', starts_at: '2026-10-05T14:00:00.000Z' };

function renderDrawer(l: LessonView) {
  apiFetch.mockImplementation(async (path: string) => (path.startsWith('/invoices?') ? [] : { url: 'https://signed/inv' }));
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <LessonDrawer lesson={l} onClose={vi.fn()} onDone={vi.fn()} />
    </QueryClientProvider>,
  );
}
afterEach(() => apiFetch.mockReset());

describe('the drawer of a makeup lesson (R-SCH-10)', () => {
  it('wears «تعويضية» and says which lesson it replaces', () => {
    renderDrawer({ ...lesson({ id: 'm-1' }), makeup: true, makeup_of: { id: 'l-9', starts_at: '2026-10-01T14:00:00.000Z' } });
    expect(screen.getByText(t.booking.makeup.tag)).toBeTruthy();
    expect(screen.getByText(t.booking.makeup.missedLabel)).toBeTruthy();
    expect(screen.getByText(t.booking.makeup.noUnit)).toBeTruthy();
  });

  it('a trial wears «تجريبية» in the drawer too', () => {
    renderDrawer(lesson({ trial: true }));
    expect(screen.getByText(t.schedule.trialTag)).toBeTruthy();
  });

  it('an ordinary lesson has neither tag nor missed-lesson row', () => {
    renderDrawer(lesson());
    expect(screen.queryByText(t.booking.makeup.tag)).toBeNull();
    expect(screen.queryByText(t.booking.makeup.missedLabel)).toBeNull();
  });
});

describe('«حجز تعويضي» once the makeup exists (R-SCH-10)', () => {
  it('the button gives way to «التعويض محجوز · <date>»', () => {
    renderDrawer(lesson({ status: 'no_show', starts_at: recently(), students: [{ ...SUHAILA, makeup: BOOKED }] }));
    expect(screen.queryByRole('link', { name: t.booking.makeup.action })).toBeNull();
    expect(screen.getByText(new RegExp(t.booking.makeup.bookedChip.split('{when}')[0] ?? ''))).toBeTruthy();
  });

  it('in a group each child has their own: one booked, the other still offered', () => {
    renderDrawer(lesson({ status: 'no_show', starts_at: recently(), students: [{ ...SUHAILA, makeup: BOOKED }, JOUD] }));
    expect(screen.getByRole('link', { name: `${t.booking.makeup.action} · ${JOUD.name}` })).toBeTruthy();
    expect(screen.queryByRole('link', { name: `${t.booking.makeup.action} · ${SUHAILA.name}` })).toBeNull();
  });

  it('is not offered after 60 days (the same rule as the app)', () => {
    renderDrawer(lesson({ status: 'no_show', starts_at: new Date(Date.now() - 61 * 86_400_000).toISOString() }));
    expect(screen.queryByRole('link', { name: t.booking.makeup.action })).toBeNull();
  });
});
