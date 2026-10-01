import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { RunningHead } from './running-head';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-01T12:20:30Z'));
});
afterEach(() => vi.useRealTimers());

describe('RunningHead', () => {
  it('shows crumbs, both calendars and the Riyadh / Cairo clocks', () => {
    render(<RunningHead crumbs={<nav aria-label={t.common.breadcrumbs}>{t.nav.students}</nav>} />);
    expect(screen.getByRole('navigation', { name: t.common.breadcrumbs }).textContent).toBe(t.nav.students);
    expect(screen.getByText('الخميس 1 أكتوبر 2026')).toBeTruthy();
    expect(screen.getByText('20 ربيع الآخر 1448 هـ')).toBeTruthy();
    expect(screen.getByText(t.runningHead.riyadh).textContent).toBe(`${t.runningHead.riyadh}15:20`);
    expect(screen.getByText(t.runningHead.cairo).textContent).toBe(`${t.runningHead.cairo}15:20`);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('ticks on the minute boundary', () => {
    render(<RunningHead />);
    act(() => vi.advanceTimersByTime(30_000));
    expect(screen.getByText(t.runningHead.riyadh).textContent).toContain('15:21');
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByText(t.runningHead.riyadh).textContent).toContain('15:22');
  });
});
