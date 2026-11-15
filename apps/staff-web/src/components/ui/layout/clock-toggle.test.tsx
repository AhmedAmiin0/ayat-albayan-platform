import { CLOCK_STORAGE_KEY } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { clockCycle, setClockPref } from '@/lib/clock';
import { t } from '@/lib/i18n/i18n';
import { ClockToggle } from './clock-toggle';

afterEach(() => {
  setClockPref('24');
  localStorage.clear();
});

const pressed = (name: string) => screen.getByRole('button', { name }).getAttribute('aria-pressed');

describe('ClockToggle', () => {
  it('switches the clock at once and saves the choice; «تلقائي» clears it', () => {
    setClockPref('auto');
    render(<ClockToggle />);
    expect(pressed(t.clock.autoShort)).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: t.clock.h12 }));
    expect(pressed(t.clock.h12)).toBe('true');
    expect(clockCycle()).toBe('12');
    expect(localStorage.getItem(CLOCK_STORAGE_KEY)).toBe('12');
    fireEvent.click(screen.getByRole('button', { name: t.clock.h24 }));
    expect(clockCycle()).toBe('24');
    fireEvent.click(screen.getByRole('button', { name: t.clock.autoShort }));
    expect(localStorage.getItem(CLOCK_STORAGE_KEY)).toBeNull();
  });
});
