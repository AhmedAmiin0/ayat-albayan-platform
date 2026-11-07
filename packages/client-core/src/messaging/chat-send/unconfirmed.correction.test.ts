import { describe, expect, it } from 'vitest';
import { replayedOther } from './unconfirmed.js';

// «تعديل» = a correction (owner 2026-11-07): the API sends «تصحيح: » + the text, linked by
// corrects_id, and says `replayed` when the request id gave back its FIRST row (review of #694).
const P = 'تصحيح: ';
const O1 = 'o1';
const fix = (text: string, id = O1) => ({ text, correction: { id, prefixes: [P] } });

describe('a new row (replayed false)', () => {
  it('is this send when it corrects the same original and ends with the text', () => {
    const row = { body: 'تصحيح: الساعة الخامسة', corrects_id: O1, replayed: false };
    expect(replayedOther(row, fix('الساعة الخامسة'))).toBe(false);
    expect(replayedOther({ ...row, body: 'تنبيه: الساعة الخامسة' }, fix('الساعة الخامسة'))).toBe(
      false,
    );
    expect(replayedOther(row, fix('تصحيح: الساعة الخامسة'))).toBe(false);
  });

  it('another text, no body or no link is not', () => {
    const row = { body: 'تصحيح: الساعة الرابعة', corrects_id: O1 };
    expect(replayedOther(row, fix('الساعة الخامسة'))).toBe(true);
    expect(replayedOther({ body: null, corrects_id: O1 }, fix('الخامسة'))).toBe(true);
    expect(replayedOther({ body: 'تصحيح: الخامسة' }, fix('الخامسة'))).toBe(true);
  });
});

describe('a replayed row (the pinned id gave back its FIRST send)', () => {
  it('a shortened resend: the first body ends with the new text, still not this send', () => {
    const first = { body: 'تصحيح: الساعة الخامسة', corrects_id: O1, replayed: true };
    expect(replayedOther(first, fix('الخامسة'))).toBe(true);
  });

  it('a plain text first, then «تعديل» under the same id: not this send', () => {
    const plain = { body: 'الساعة الخامسة', corrects_id: null, replayed: true };
    expect(replayedOther(plain, fix('الساعة الخامسة'))).toBe(true);
  });

  it('the same text correcting another message: not this send', () => {
    const other = { body: 'تصحيح: الساعة الخامسة', corrects_id: 'o2', replayed: true };
    expect(replayedOther(other, fix('الساعة الخامسة'))).toBe(true);
  });

  it('a retry of this very correction after a lost answer IS this send', () => {
    const same = { body: 'تصحيح: الساعة الخامسة', corrects_id: O1, replayed: true };
    expect(replayedOther(same, fix(' الساعة الخامسة '))).toBe(false);
  });
});

describe('an admin-reworded prefix (round 3, item 2)', () => {
  const reworded = (text: string) => ({ text, correction: { id: O1, prefixes: ['تعديل: ', P] } });

  it('a retry of this correction under the new wording IS this send', () => {
    const same = { body: 'تعديل: الساعة الخامسة', corrects_id: O1, replayed: true };
    expect(replayedOther(same, reworded('الساعة الخامسة'))).toBe(false);
    expect(replayedOther(same, reworded('تصحيح: الساعة الخامسة'))).toBe(false);
  });

  it('a row under the bundled prefix still is; another text is not', () => {
    const old = { body: 'تصحيح: الساعة الخامسة', corrects_id: O1, replayed: true };
    expect(replayedOther(old, reworded('الساعة الخامسة'))).toBe(false);
    expect(replayedOther(old, reworded('الخامسة'))).toBe(true);
  });
});

it('a plain text keeps the exact rule: the prefixed body is another message', () => {
  expect(replayedOther({ body: 'تصحيح: الساعة الخامسة' }, { text: 'الساعة الخامسة' })).toBe(true);
});
