import { describe, expect, it } from 'vitest';
import { replayedOther } from './unconfirmed.js';

// «تعديل» = a correction (owner 2026-11-07): the API sends «تصحيح: » + the text, linked by
// corrects_id, says `replayed` when the request id gave back its FIRST row, and `same_request`
// when that first row IS this request (the server decides: review of #694, round 4).
const O1 = 'o1';
const fix = (text: string, id = O1) => ({ text, correction: { id } });

describe('a new row (replayed false)', () => {
  it('is this send when it corrects the same original, whatever prefix the API used', () => {
    const row = { body: 'تصحيح: الساعة الخامسة', corrects_id: O1, replayed: false };
    expect(replayedOther(row, fix('الساعة الخامسة'))).toBe(false);
    expect(replayedOther({ ...row, body: 'تنبيه: الساعة الخامسة' }, fix('الساعة الخامسة'))).toBe(
      false,
    );
  });

  it('a row with no link, or linked to another original, is not', () => {
    expect(replayedOther({ body: 'تصحيح: الخامسة' }, fix('الخامسة'))).toBe(true);
    expect(replayedOther({ body: 'تصحيح: الخامسة', corrects_id: 'o2' }, fix('الخامسة'))).toBe(
      true,
    );
  });
});

describe('a replayed row (the pinned id gave back its FIRST send)', () => {
  const first = { body: 'تعديل: الساعة الخامسة', corrects_id: O1, replayed: true };

  it('the API says same_request (a reworded prefix, a stale client): it IS this send', () => {
    expect(replayedOther({ ...first, same_request: true }, fix('الساعة الخامسة'))).toBe(false);
  });

  it('the API says it is another request (another text): not this send', () => {
    expect(replayedOther({ ...first, same_request: false }, fix('الخامسة'))).toBe(true);
  });

  it('no same_request from the API: never guessed from the body', () => {
    const bundled = { ...first, body: 'تصحيح: الساعة الخامسة' };
    expect(replayedOther(bundled, fix('الساعة الخامسة'))).toBe(true);
  });

  it('the same request for another original: not this send', () => {
    const other = { ...first, corrects_id: 'o2', same_request: true };
    expect(replayedOther(other, fix('الساعة الخامسة'))).toBe(true);
  });
});

it('a plain text keeps the exact rule: the prefixed body is another message', () => {
  expect(replayedOther({ body: 'تصحيح: الساعة الخامسة' }, { text: 'الساعة الخامسة' })).toBe(true);
});
