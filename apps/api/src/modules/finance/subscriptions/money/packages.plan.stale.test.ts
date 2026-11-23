import { describe, expect, it } from 'vitest';
import { staleTaskKeys } from './packages.plan';

const task = (subject: string, kind = 'renewal_due') => ({ subject_id: subject, dedup_key: `${kind}:${subject}` });

describe('staleTaskKeys: which open tasks the evaluated students no longer call for', () => {
  it('closes a task about an evaluated package that is not kept', () => {
    const open = [task('a'), task('a', 'subscription_unpaid'), task('b')];
    const scope = { subjectIds: new Set(['a', 'b']), keep: new Set(['renewal_due:a']) };
    expect(staleTaskKeys(open, scope)).toEqual(['subscription_unpaid:a', 'renewal_due:b']);
  });

  it('leaves tasks about packages not evaluated (another student, or one that failed)', () => {
    expect(staleTaskKeys([task('z')], { subjectIds: new Set(['a']), keep: new Set() })).toEqual([]);
  });

  it('no open tasks → nothing to close', () => {
    expect(staleTaskKeys([], { subjectIds: new Set(['a']), keep: new Set() })).toEqual([]);
  });
});
