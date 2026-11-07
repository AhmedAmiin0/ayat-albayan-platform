import { afterEach, describe, expect, it } from 'vitest';
import { ar } from '@/common/infra/i18n/server-text';
import { assertRepliesToOriginal, sameRequest, withSameRequest } from './correction-checks';

// Review of #694 (round 4, item 1): the SERVER says whether a replayed first row is this very
// correction, under the admins' live wording or the bundled one, so no client guesses the prefix.
const DEFAULT_PREFIX = ar.inbox.correction.prefix;
const O1 = 'o1';
const input = (text: string, correctsId: string | undefined = O1) => ({
  text,
  clientRequestId: 'r1',
  correctsId,
});

afterEach(() => {
  ar.inbox.correction.prefix = DEFAULT_PREFIX;
});

describe('sameRequest', () => {
  it('admin-reworded prefix + a retry from a stale client: recognised', () => {
    ar.inbox.correction.prefix = 'تعديل: ';
    const first = { body: 'تعديل: الساعة الخامسة', corrects_id: O1 };
    expect(sameRequest(first, input('الساعة الخامسة'))).toBe(true);
    expect(sameRequest(first, input(`${DEFAULT_PREFIX}الساعة الخامسة`))).toBe(true);
  });

  it('a first row under the bundled prefix (written before the rewording) is recognised', () => {
    ar.inbox.correction.prefix = 'تعديل: ';
    const first = { body: `${DEFAULT_PREFIX}الساعة الخامسة`, corrects_id: O1 };
    expect(sameRequest(first, input(' الساعة الخامسة '))).toBe(true);
  });

  it('another text, another original or a plain send: not the same request', () => {
    const first = { body: `${DEFAULT_PREFIX}الساعة الخامسة`, corrects_id: O1 };
    expect(sameRequest(first, input('الخامسة'))).toBe(false);
    expect(sameRequest(first, input('الساعة الخامسة', 'o2'))).toBe(false);
    expect(sameRequest(first, { text: 'الساعة الخامسة', clientRequestId: 'r1' })).toBe(false);
    expect(sameRequest({ body: 'الساعة الخامسة', corrects_id: null }, input('الساعة الخامسة')))
      .toBe(false);
  });
});

describe('withSameRequest', () => {
  const view = { body: `${DEFAULT_PREFIX}الخامسة`, corrects_id: O1 };
  it('only a replay carries the flag', () => {
    expect(withSameRequest({ view, replayed: true }, input('الخامسة')).sameRequest).toBe(true);
    expect(withSameRequest({ view, replayed: false }, input('الخامسة'))).not.toHaveProperty(
      'sameRequest',
    );
  });
});

describe('assertRepliesToOriginal', () => {
  it('a correction without the wamid context: 409 correction_other_number', () => {
    expect(() => assertRepliesToOriginal(O1, { reply_to_wa_id: null })).toThrow();
    expect(() => assertRepliesToOriginal(O1, { reply_to_wa_id: 'wamid.O' })).not.toThrow();
    expect(() => assertRepliesToOriginal(undefined, {})).not.toThrow();
  });
});
