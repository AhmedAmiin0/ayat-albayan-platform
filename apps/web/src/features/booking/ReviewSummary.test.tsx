import { counted, type BookingTeacherOption } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { emptyDraft, type BookingDraft } from './draft';
import { packageDaysNote } from './package-days';
import { ReviewSummary } from './ReviewSummary';

const apiFetch = vi.hoisted(() => vi.fn(() => Promise.resolve({ total: 1080, currency: 'SAR', fx: null })));
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const TEACHER = { id: 't1', display_name_ar: 'أبرار', tz: 'Africa/Cairo', has_availability: true } as BookingTeacherOption;
const SUN = '2026-10-04T14:00:00.000Z'; // Sunday 17:00 Riyadh
const TUE = '2026-10-06T16:30:00.000Z'; // Tuesday 19:30 Riyadh
const dayAt = (day: number, time: string) => t.booking.dayAt.replace('{day}', t.enums.weekday[day as 0]).replace('{time}', time);

function renderSummary(o: Partial<BookingDraft>) {
  const draft: BookingDraft = { ...emptyDraft(), students: [{ id: 's1', name: 'سهيلة', code: null }], teacher: TEACHER, startsAt: SUN, ...o };
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ReviewSummary draft={draft} />
    </QueryClientProvider>,
  );
}

describe('ReviewSummary: each day with its time (owner 2026-10-18)', () => {
  it('lists every picked day at its own time and how often', () => {
    renderSummary({ extra: [TUE] });
    expect(screen.getByText(dayAt(0, '17:00'))).toBeTruthy();
    expect(screen.getByText(dayAt(2, '19:30'))).toBeTruthy();
    expect(screen.getByText(`(${counted(t.booking.perWeek, 2)})`)).toBeTruthy();
    expect(screen.getByText(t.booking.invoice.label)).toBeTruthy();
  });

  it('the admin keeps the note when the days don’t add up to the package', () => {
    renderSummary({ pkg: '12', extra: [TUE] });
    expect(screen.getByText(packageDaysNote('12', 2) ?? 'none')).toBeTruthy();
  });

  it('the assistant’s course: lesson count instead of a price, no invoice', () => {
    renderSummary({ extra: [TUE], course: { perWeek: 2, lessonsTotal: 8 } });
    expect(screen.getByText(counted(t.schedule.lessonCount, 8))).toBeTruthy();
    expect(screen.queryByText(t.booking.invoice.label)).toBeNull();
    expect(screen.getByText(new RegExp(counted(t.booking.courseEnds, 8).split('{date}')[0] ?? ''))).toBeTruthy();
  });
});
