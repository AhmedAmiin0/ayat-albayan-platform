import { describe, expect, it } from 'vitest';
import ar from '../../i18n/ar.json' with { type: 'json' };
import { packageProgress } from './package-progress.js';

const forms = ar.subscriptions.progress;

describe('packageProgress (docs/07 §6, Arabic agreement)', () => {
  it.each([
    [8, 8, 'انتهت الباقة'],
    [7, 8, 'بقيت حلقة واحدة'],
    [6, 8, 'بقيت حلقتان'],
    [5, 8, 'بقيت 3 حلقات'],
    [0, 10, 'بقيت 10 حلقات'],
    [0, 11, 'بقيت 11 حلقة'],
    [0, 28, 'بقيت 28 حلقة'],
    [9, 8, 'حضر حلقة زائدة عن الباقة'],
    [10, 8, 'حضر حلقتين زائدتين عن الباقة'],
    [13, 8, 'حضر 5 حلقات زائدة عن الباقة'],
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
