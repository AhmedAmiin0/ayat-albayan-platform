import { clockOfHhmm } from '@ab/time';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { setClockPref } from '@ab/web-kit/lib/clock';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import { ClockOptions } from './ClockOptions';

const TIMES = ['09:00', '18:30'] as const;

afterEach(() => setClockPref('auto'));

const options = () => screen.getAllByRole<HTMLOptionElement>('option');

describe('ClockOptions', () => {
  it('each option keeps the stored 24 h value and reads in the chosen cycle', () => {
    setClockPref('12');
    render(
      <select aria-label="time">
        <ClockOptions times={TIMES} />
      </select>,
    );
    expect(options().map((o) => o.value)).toEqual([...TIMES]);
    expect(options()[1]?.textContent).toBe(clockOfHhmm('18:30', '12', locale));
  });

  it('a new cycle relabels the options without changing their values', () => {
    setClockPref('24');
    render(
      <select aria-label="time">
        <ClockOptions times={TIMES} />
      </select>,
    );
    expect(options()[1]?.textContent).toBe(clockOfHhmm('18:30', '24', locale));
    act(() => setClockPref('12'));
    expect(options()[1]?.textContent).toBe(clockOfHhmm('18:30', '12', locale));
    expect(options()[1]?.value).toBe('18:30');
  });
});
