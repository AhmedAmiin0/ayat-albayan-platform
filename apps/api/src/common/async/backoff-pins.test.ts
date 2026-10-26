import { backoff } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { MAX_ATTEMPTS, retryDelayMs } from '../../modules/platform/google-sync/http/backoff';
import { RETRY_DELAYS_MS } from '../../modules/reporting/report-pdf/report-pdf.job';
import { RECORD_DELAYS_MS } from '../../modules/messaging/whatsapp/sender/message.job';

// docs/27 P1: the five backoff sites now share @ab/shared retry/backoffDelay. These pin the
// delays and caps each one had before, so the move changed no wait.
describe('backoff sites keep their delays (docs/27 P1)', () => {
  it('google-sync: 30 s × 2^n, capped at 30 min, ±50 % jitter, 5 attempts', () => {
    const mid = (n: number) => retryDelayMs(n, () => 0.5);
    expect([0, 1, 2, 3, 4, 5, 6, 7, 20].map(mid)).toEqual([30_000, 30_000, 60_000, 120_000, 240_000, 480_000, 960_000, 1_800_000, 1_800_000]);
    expect(retryDelayMs(2, () => 0)).toBe(30_000);
    expect(retryDelayMs(2, () => 0.999)).toBe(89_940);
    expect(MAX_ATTEMPTS).toBe(5);
  });

  it('whatsapp sender: 1 min × 5^(n-1), capped at 1 h', () => {
    expect([-1, 0, 1, 2, 3, 4, 2.7, 99].map(backoff)).toEqual([60_000, 60_000, 60_000, 300_000, 1_500_000, 3_600_000, 300_000, 3_600_000]);
  });

  it('report PDF publish: 2 s then 8 s; «sent» write: 0.5 s then 2 s', () => {
    expect(RETRY_DELAYS_MS).toEqual([2_000, 8_000]);
    expect(RECORD_DELAYS_MS).toEqual([500, 2_000]);
  });
});
