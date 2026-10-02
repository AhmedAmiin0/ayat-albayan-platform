import { describe, expect, it } from 'vitest';
import ar from '../../i18n/ar.json' with { type: 'json' };
import { packageProgress } from './package-progress.js';

const forms = ar.subscriptions.progress;

describe('packageProgress (docs/07 §6, Arabic agreement)', () => {
  it.each([
    [8, 8, 'الباقة خلصت'],
    [7, 8, 'فاضل حلقة'],
    [6, 8, 'فاضل حلقتين'],
    [5, 8, 'فاضل 3 حلقات'],
    [0, 10, 'فاضل 10 حلقات'],
    [0, 11, 'فاضل 11 حلقة'],
    [0, 28, 'فاضل 28 حلقة'],
    [9, 8, 'حضر حلقة زيادة عن الباقة'],
    [10, 8, 'حضر حلقتين زيادة عن الباقة'],
    [13, 8, 'حضر 5 حلقات زيادة عن الباقة'],
  ])('used %i of %i → «%s»', (used, total, label) => {
    expect(packageProgress(used, total, { forms }).remainingLabel).toBe(label);
  });

  it('zero is the expired status wording', () => {
    expect(forms.zero).toBe(ar.enums.subscriptionStatus.expired);
  });

  it.each([
    [5, 8, 'neutral'],
    [6, 8, 'act'], // 2 left: the R-SUB-02 trigger
    [8, 8, 'act'],
    [9, 8, 'act'],
  ] as const)('used %i of %i → tone %s', (used, total, tone) => {
    expect(packageProgress(used, total, { forms }).tone).toBe(tone);
  });

  it('follows the renewal threshold setting when given', () => {
    expect(packageProgress(5, 8, { forms, threshold: 3 }).tone).toBe('act');
    expect(packageProgress(6, 8, { forms, threshold: 1 }).tone).toBe('neutral');
  });

  it('returns the numbers', () => {
    expect(packageProgress(3, 8, { forms })).toMatchObject({ used: 3, total: 8, remaining: 5 });
  });
});
