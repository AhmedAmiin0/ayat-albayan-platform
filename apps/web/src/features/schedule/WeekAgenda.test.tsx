import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { FATMA, lesson } from './lesson-fixture';
import { WeekGrid } from './WeekGrid';

// Sat 3 Oct 2026 starts the Riyadh week; the lessons are Sun 4 (Abrar) and Mon 5 (Fatma).
const SUNDAY = lesson({ id: 'a' });
const MONDAY = lesson({ id: 'b', teacher: FATMA, starts_at: '2026-10-05T10:00:00.000Z' });
const phone = () => vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));

describe('WeekGrid on a phone (under md): a list per day instead of seven squeezed columns', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('wide: the table; narrow: a heading per day with the lessons, teacher names above them', () => {
    const { unmount } = render(<WeekGrid week="2026-10-03" today="2026-10-04" lessons={[SUNDAY, MONDAY]} onOpen={vi.fn()} />);
    expect(screen.getByRole('table', { name: t.schedule.grid })).toBeTruthy();
    unmount();

    phone();
    const onOpen = vi.fn();
    render(<WeekGrid week="2026-10-03" today="2026-10-04" lessons={[SUNDAY, MONDAY]} onOpen={onOpen} />);
    expect(screen.queryByRole('table')).toBeNull();
    const days = screen.getAllByRole('region');
    expect(days).toHaveLength(7);
    const today = days.find((d) => d.getAttribute('aria-current') === 'date');
    expect(today?.textContent).toContain(t.schedule.today);
    // Two teachers in the list: each lesson sits under its teacher's name.
    expect(within(today as HTMLElement).getByText('أبرار')).toBeTruthy();
    expect(screen.getAllByText(t.schedule.noLessons)).toHaveLength(5);
    fireEvent.click(within(today as HTMLElement).getByRole('button'));
    expect(onOpen).toHaveBeenCalledWith(SUNDAY);
  });

  it('one teacher (my week): no name line', () => {
    phone();
    render(<WeekGrid week="2026-10-03" today="2026-10-04" lessons={[SUNDAY]} onOpen={vi.fn()} />);
    expect(screen.queryByText('أبرار')).toBeNull();
  });
});
