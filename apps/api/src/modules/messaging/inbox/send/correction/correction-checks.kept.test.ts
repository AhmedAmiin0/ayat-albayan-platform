import { afterEach, describe, expect, it } from 'vitest';
import { ar } from '@/common/infra/i18n/server-text';
import { sameRequest } from './correction-checks';

// Follow-up to #694 (items 2-3): a correction keeps its own text (messages.correction_text), so an
// exact retry is recognised under any wording of the prefix, and only an exact one.
const DEFAULT_PREFIX = ar.inbox.correction.prefix;
const O1 = 'o1';
const input = (text: string) => ({ text, clientRequestId: 'r1', correctsId: O1 });
const sentUnder = (prefix: string, own: string) => ({
  body: `${prefix}${own}`,
  corrects_id: O1,
  correction_text: own,
});

afterEach(() => {
  ar.inbox.correction.prefix = DEFAULT_PREFIX;
});

describe('sameRequest on a row that kept its own text', () => {
  it('custom prefix A sent, admins reword it to B: the exact retry is the same request', () => {
    ar.inbox.correction.prefix = 'أ: ';
    const first = sentUnder('أ: ', 'الساعة الخامسة');
    ar.inbox.correction.prefix = 'ب: ';
    expect(sameRequest(first, input('الساعة الخامسة'))).toBe(true);
    expect(sameRequest(first, input(' الساعة الخامسة '))).toBe(true);
    expect(sameRequest(first, input('أ: الساعة الخامسة'))).toBe(true); // a stale client's prefix
  });

  it('a different text under the pinned id is not the same request', () => {
    ar.inbox.correction.prefix = 'ب: ';
    const first = sentUnder('أ: ', 'الساعة الخامسة مساء');
    expect(sameRequest(first, input('الساعة السادسة'))).toBe(false);
    expect(sameRequest(first, input('الخامسة مساء'))).toBe(false); // shortened: never "sent"
    expect(sameRequest(first, input('الساعة الخامسة مساء غدًا'))).toBe(false);
  });

  it('the kept text decides, not the body: a body that no longer matches still compares', () => {
    const first = { body: null, corrects_id: O1, correction_text: 'الخامسة' };
    expect(sameRequest(first, input('الخامسة'))).toBe(true);
    expect(sameRequest(first, input('السادسة'))).toBe(false);
  });
});
