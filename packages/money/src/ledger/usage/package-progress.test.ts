import { describe, expect, it } from 'vitest';
import { packageProgress, type PackageProgressForms } from './package-progress';

const forms: PackageProgressForms = {
  zero: 'zero',
  left: { one: 'left 1', two: 'left 2', few: '{n} left', other: '{n} left' },
  over: { one: 'over 1', two: 'over 2', few: '{n} over', other: '{n} over' },
};

describe('packageProgress (remaining label and tone)', () => {
  it('none left reads the zero form and asks to act', () => {
    expect(packageProgress(8, 8, { forms })).toMatchObject({
      remaining: 0,
      remainingLabel: 'zero',
      tone: 'act',
    });
  });

  it('lessons left read the left forms; above the threshold the tone stays neutral', () => {
    const p = packageProgress(2, 8, { forms });
    expect(p).toMatchObject({ remaining: 6, tone: 'neutral' });
    expect(p.remainingLabel).toBe(packageProgress(0, 6, { forms }).remainingLabel);
    expect(packageProgress(7, 8, { forms }).remainingLabel).toBe('left 1');
  });

  it('attended past the package reads the over forms with a positive count', () => {
    const p = packageProgress(10, 8, { forms });
    expect(p).toMatchObject({ remaining: -2, remainingLabel: 'over 2', tone: 'act' });
  });

  it('the threshold defaults to 2 and can be set', () => {
    expect(packageProgress(6, 8, { forms }).tone).toBe('act');
    expect(packageProgress(5, 8, { forms }).tone).toBe('neutral');
    expect(packageProgress(5, 8, { forms, threshold: 3 }).tone).toBe('act');
  });
});
