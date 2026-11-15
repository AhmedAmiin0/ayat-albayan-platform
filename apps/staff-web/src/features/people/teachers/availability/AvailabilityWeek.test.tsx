import type { Weekday } from '@ab/shared';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { AvailabilityWeek } from './AvailabilityWeek';
import { emptyGrid, WEEK_ORDER, type Grid } from './grid';

const CAIRO = 'Africa/Cairo';
const r = (start: string, end: string) => ({ start, end });

function renderWeek(grid: Grid) {
  render(<AvailabilityWeek grid={grid} tz={CAIRO} onDay={vi.fn()} />);
  return screen.getByRole('table', { name: t.availability.title });
}
const row = (day: Weekday) =>
  screen.getByRole('rowheader', { name: new RegExp(`^${t.enums.weekday[day]}`) }).closest('[role=row]') as HTMLElement;

describe('AvailabilityWeek (R-TCH-02, docs/07 §8)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-01T12:20:00Z')); // Thursday, 15:20 in Cairo
  });
  afterEach(() => vi.useRealTimers());

  it('lists the week from السبت to الجمعة', () => {
    renderWeek(emptyGrid());
    const days = screen.getAllByRole('rowheader').map((h) => h.firstChild?.textContent);
    expect(days).toEqual(WEEK_ORDER.map((d) => t.enums.weekday[d]));
    expect(days[0]).toBe(t.enums.weekday[6]);
  });

  it('marks today in the grid tz with «اليوم» and the now-line, only on that row', () => {
    const table = renderWeek({ ...emptyGrid(), 4: [r('10:00', '13:00')] });
    expect(within(row(4)).getByText(t.availability.today)).toBeTruthy();
    expect(within(table).getAllByText(t.availability.today)).toHaveLength(1);
    expect(row(4).querySelectorAll('[data-now]')).toHaveLength(1);
    expect(table.querySelectorAll('[data-now]')).toHaveLength(1);
  });

  it('an empty day says so and offers «إضافة موعد» named for the day', () => {
    renderWeek(emptyGrid());
    const friday = within(row(5));
    expect(friday.getByText(t.availability.empty)).toBeTruthy();
    expect(friday.getByRole('button', { name: `${t.availability.addSlot} ${t.enums.weekday[5]}` })).toBeTruthy();
  });

  it('draws one gold bar per range and a hatched clash where two overlap', () => {
    renderWeek({ ...emptyGrid(), 1: [r('15:00', '18:00'), r('17:30', '20:00')] });
    const monday = row(1);
    expect(monday.querySelectorAll('[data-bar]')).toHaveLength(2);
    expect(monday.querySelectorAll('[data-clash]')).toHaveLength(1);
    const span = t.availability.overlapSpan.replace('{from}', '17:30').replace('{to}', '18:00');
    expect(within(monday).getByRole('alert').textContent).toBe(`${t.availability.overlap}${t.common.listSeparator}${span}`);
  });

  it('axis hours centre toward the inline-start in either direction (LTR mirror)', () => {
    renderWeek(emptyGrid());
    const mid = document.querySelector('[data-axis-hour="12"]');
    expect(mid?.className).toContain('rtl:translate-x-1/2');
    expect(mid?.className).toContain('ltr:-translate-x-1/2');
    expect(mid?.className).not.toMatch(/(^|\s)translate-x-1\/2/);
  });

  it('the range whose selects have focus is drawn as the band being edited', () => {
    renderWeek({ ...emptyGrid(), 1: [r('15:00', '16:00'), r('17:00', '20:00')] });
    const monday = row(1);
    const editing = () => monday.querySelectorAll('[data-bar="editing"]');
    const [, secondStart] = within(monday).getAllByLabelText(`${t.enums.weekday[1]} ${t.availability.from}`);
    const [, secondEnd] = within(monday).getAllByLabelText(`${t.enums.weekday[1]} ${t.availability.to}`);
    fireEvent.focusIn(secondStart as HTMLElement);
    expect(editing()).toHaveLength(1);
    expect(monday.querySelectorAll('[data-bar]')[1]?.getAttribute('data-bar')).toBe('editing');
    expect(editing()[0]?.querySelectorAll('i')).toHaveLength(2); // the two lapis grips
    fireEvent.focusOut(secondStart as HTMLElement, { relatedTarget: secondEnd });
    expect(editing()).toHaveLength(1); // still the same range
    fireEvent.focusOut(secondEnd as HTMLElement, { relatedTarget: document.body });
    expect(editing()).toHaveLength(0);
  });
});
