import { CLOCK_STORAGE_KEY } from '@ab/time';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { clockCycle, setClockPref } from '@ab/web-kit/lib/clock';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { ClockToggle } from '@ab/web-kit/components/ui/layout/ClockToggle';

afterEach(() => {
  setClockPref('24');
  localStorage.clear();
});

const group = () => screen.getByRole('group', { name: t.clock.label });

describe('ClockToggle size="compact"', () => {
  it('shows «auto · 12 · 24»; each short segment keeps its full name', () => {
    render(<ClockToggle size="compact" />);
    const buttons = within(group()).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual([
      t.clock.autoShort,
      t.clock.h12Short,
      t.clock.h24Short,
    ]);
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
      null,
      t.clock.h12,
      t.clock.h24,
    ]);
    for (const b of buttons) expect(b.className).toContain('min-w-11');
  });

  it('changes and keeps the same preference as the full switch', () => {
    setClockPref('auto');
    render(<ClockToggle size="compact" />);
    fireEvent.click(screen.getByRole('button', { name: t.clock.h12 }));
    expect(clockCycle()).toBe('12');
    expect(localStorage.getItem(CLOCK_STORAGE_KEY)).toBe('12');
    expect(screen.getByRole('button', { name: t.clock.h12 }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: t.clock.autoShort }));
    expect(localStorage.getItem(CLOCK_STORAGE_KEY)).toBeNull();
  });

  it('follows a change made by another switch on the page', () => {
    render(<ClockToggle size="compact" />);
    fireEvent.click(screen.getByRole('button', { name: t.clock.h12 }));
    render(<ClockToggle />);
    const full = screen.getAllByRole('button', { name: t.clock.h12 });
    expect(full.map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'true']);
  });
});
