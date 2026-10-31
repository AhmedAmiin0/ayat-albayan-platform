import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { scheduleLesson, teacher } from '../academy.fixtures';
import { renderWithQuery } from '../academy.test-utils';
import { salesClockLines } from './SalesLessonDetails';
import { SalesSchedule } from './SalesSchedule';
import { locale } from '@/lib/i18n/locale';

/** The cycle the suite reads times in (test-setup saves 24 h). */
const C24 = { cycle: '24', locale } as const;
/** …read in the suite's viewer zone (the academy's, Riyadh). */
const Z24 = { ...C24, tz: 'Asia/Riyadh' };

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const iso = (min: number) => new Date(Date.now() + min * 60_000).toISOString();
const LATER = scheduleLesson({
  id: 'l-later', starts_at: iso(120), ends_at: iso(165), status: 'scheduled', trial: true,
  teacher: { id: 'tc1', display_name_ar: 'أبرار', display_name_en: 'Abrar', tz: 'Africa/Cairo' },
  students: [{ id: 's1', code: 'AB-0183', name: 'سهيلة', tz: 'Asia/Muscat' }],
});
const NOW_LESSON = scheduleLesson({ id: 'l-now', starts_at: iso(-5), ends_at: iso(25), students: [{ id: 's3', code: 'AB-0200', name: 'يوسف' }] });

function renderDay() {
  apiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('/sales/schedule')) return { date: '2026-10-12', lessons: [LATER, NOW_LESSON] };
    if (path === '/sales/teachers') return [teacher()];
    throw new Error(path);
  });
  renderWithQuery(<SalesSchedule search={{ date: '2026-10-12' }} onSearch={vi.fn()} />);
}

afterEach(() => apiFetch.mockReset());

const ADMIN_ONLY = [
  t.lessons.cancelTitle, t.lessons.rescheduleTitle, t.lessons.timeEdit.title, t.booking.invoice.label,
  t.reports.formTitle, t.booking.makeup.missedLabel, t.subscriptions.unpaidFlag,
];

describe('sales: a lesson chip opens the read-only admin drawer', () => {
  it('details only: status, tags, every clock, length, teacher, students with codes; no admin action', async () => {
    renderDay();
    fireEvent.click(await screen.findByRole('button', { name: /سهيلة/ }));
    const drawer = screen.getByRole('dialog', { name: 'سهيلة' });
    expect(within(drawer).getByText(t.enums.lessonStatus.scheduled)).toBeTruthy();
    expect(within(drawer).getByText(t.schedule.trialTag)).toBeTruthy();
    expect(within(drawer).getByText(new RegExp(t.schedule.viewerTime))).toBeTruthy();
    for (const line of salesClockLines(LATER, Z24)) expect(within(drawer).getByText(line)).toBeTruthy();
    expect(within(drawer).getByText('أبرار')).toBeTruthy();
    expect(within(drawer).getByText('AB-0183')).toBeTruthy();
    expect(within(drawer).getByText(t.lessons.sheet.readOnly)).toBeTruthy();
    for (const word of ADMIN_ONLY) expect(within(drawer).queryByText(word)).toBeNull();
    // Owner 2026-10-26: the lesson link row (this one has none); LessonMeetingLink.test covers a URL.
    expect(within(drawer).getByText(t.lessons.joinLink)).toBeTruthy();
    expect(within(drawer).getByText(t.lessons.noLink)).toBeTruthy();
    // Only «إغلاق»: no confirm, cancel, move, edit, invoice or report button.
    expect(within(drawer).getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent)).toEqual([t.common.close]);
    fireEvent.click(within(drawer).getByRole('button', { name: t.common.close }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('a running lesson keeps «جارية الآن» and «ادخل الحلقة» in the drawer', async () => {
    renderDay();
    fireEvent.click(await screen.findByRole('button', { name: /يوسف/ }));
    const drawer = screen.getByRole('dialog', { name: 'يوسف' });
    expect(within(drawer).getByText(t.sales.academySchedule.liveNow)).toBeTruthy();
    expect(within(drawer).getByText(t.classroom.enter)).toBeTruthy();
  });

  it('salesClockLines: none for Riyadh or an old cache without zones', () => {
    expect(salesClockLines(scheduleLesson(), Z24)).toEqual([]);
    expect(salesClockLines(LATER, Z24)).toHaveLength(2);
  });

  it('salesClockLines: compares with the zone it is given (a Cairo viewer drops the Cairo teacher)', () => {
    expect(salesClockLines(LATER, { ...C24, tz: 'Africa/Cairo' })).toHaveLength(1);
  });
});
