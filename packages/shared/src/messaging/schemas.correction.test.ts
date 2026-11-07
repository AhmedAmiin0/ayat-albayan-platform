import { describe, expect, it } from 'vitest';
import { CORRECTION_PREFIX_ROOM, threadTextSchema, WA_TEXT_MAX } from './schemas.js';

// «تعديل» = a correction (owner 2026-11-07): the text endpoint takes the corrected message's id.
const ID = 'a0000000-0000-4000-8000-0000000000c1';

describe('threadTextSchema correctsId', () => {
  it('is optional and must be a uuid', () => {
    expect(threadTextSchema.safeParse({ text: 'نص' }).success).toBe(true);
    expect(threadTextSchema.safeParse({ text: 'نص', correctsId: ID }).data?.correctsId).toBe(ID);
    expect(threadTextSchema.safeParse({ text: 'نص', correctsId: 'wamid.x' }).success).toBe(false);
  });

  it('a correction leaves room for its prefix; a plain text keeps the full limit', () => {
    const long = 'ن'.repeat(WA_TEXT_MAX - CORRECTION_PREFIX_ROOM + 1);
    expect(threadTextSchema.safeParse({ text: long }).success).toBe(true);
    expect(threadTextSchema.safeParse({ text: long, correctsId: ID }).success).toBe(false);
  });
});
