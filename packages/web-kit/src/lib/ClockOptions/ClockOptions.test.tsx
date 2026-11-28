import { CLOCK_STORAGE_KEY } from '@ab/time';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ClockOptions } from './ClockOptions';

const TIMES = ['09:00', '18:30'] as const;

afterEach(() => localStorage.clear());

const options = () => screen.getAllByRole<HTMLOptionElement>('option');

const renderOptions = () =>
  render(
    <select aria-label="time">
      <ClockOptions times={TIMES} />
    </select>,
  );

describe('ClockOptions', () => {
  it('each option keeps the stored 24 h value and reads in 12-hour time', () => {
    renderOptions();
    expect(options().map((o) => o.value)).toEqual([...TIMES]);
    expect(options()[0]?.textContent).toBe('9:00 ص');
    expect(options()[1]?.textContent).toBe('6:30 م');
  });

  it('a stored 24-hour choice does not change the labels or the values', () => {
    localStorage.setItem(CLOCK_STORAGE_KEY, '24');
    renderOptions();
    expect(options()[1]?.textContent).toBe('6:30 م');
    expect(options()[1]?.value).toBe('18:30');
  });
});
