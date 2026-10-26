import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { parseRank, syncResultText } from './fallback-rank';

const s = t.numbers.templateSync;

describe('parseRank', () => {
  it.each([
    ['0', 0],
    ['5', 5],
    [' 100 ', 100],
    ['999', 999],
  ])('accepts %s', (text, rank) => expect(parseRank(text)).toBe(rank));

  it.each(['', '-1', '1000', '1.5', '1e2', 'abc', '١٢'])('refuses %s', (text) =>
    expect(parseRank(text)).toBeNull(),
  );
});

describe('syncResultText', () => {
  it('a sync says what it found', () => {
    const text = syncResultText({ ok: true, meta_count: 12, synced: 7 });
    expect(text).toBe(s.done.replace('{{meta}}', '12').replace('{{synced}}', '7'));
  });

  it('a failure names its reason; Meta’s own message is kept', () => {
    expect(syncResultText({ ok: false, error: 'not_configured', meta_count: 0, synced: 0 })).toBe(
      s.failed.replace('{{error}}', s.errors.not_configured),
    );
    expect(
      syncResultText({ ok: false, error: 'meta_error', message: 'boom', meta_count: 0, synced: 0 }),
    ).toContain('boom');
    expect(syncResultText({ ok: false, error: 'other', meta_count: 0, synced: 0 })).toContain(
      t.numbers.errors.generic,
    );
  });
});
