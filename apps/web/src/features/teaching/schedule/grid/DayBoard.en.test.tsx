import en from '@ab/shared/i18n/en.json';
import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DayBoard } from './DayBoard';
import { lesson } from '../lesson/lesson-fixture';
import { boardRows } from '../overview';
import { T_ABRAR, T_FATMA, T_NOUR } from '../overview-fixture';
import { ScheduleNav } from '../ScheduleNav';

// The calendar in English (LTR): every word from en.json, Western digits, the same layout.
vi.mock('@/lib/i18n/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@/lib/i18n/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

const BEFORE = new Date('2026-10-03T09:00:00.000Z');

describe('all-teachers calendar in English', () => {
  it('the day board reads in English', () => {
    const rows = boardRows([T_ABRAR, T_FATMA, T_NOUR], [lesson({ trial: true })]);
    render(<DayBoard day="2026-10-04" rows={rows} now={BEFORE} onOpen={vi.fn()} />);
    const abrar = screen.getByRole('region', { name: 'أبرار' });
    expect(within(abrar).getByText('Trial')).toBeTruthy();
    expect(within(abrar).getByText('4 of 10')).toBeTruthy();
    expect(within(abrar).getByText('Free 16:00 – 17:00')).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'نور' })).getByText(en.schedule.noWindows)).toBeTruthy();
  });

  it('a day off and the nav controls', () => {
    render(<DayBoard day="2026-10-05" rows={boardRows([T_FATMA], [])} now={BEFORE} onOpen={vi.fn()} />);
    expect(screen.getByText('Day off · سفر')).toBeTruthy();
    render(<ScheduleNav search={{ view: 'day', day: '2026-10-05' }} today="2026-10-03" onSearch={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Day' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: en.schedule.nextDay })).toBeTruthy();
    expect(screen.getByText('Monday 5 October')).toBeTruthy();
  });
});
