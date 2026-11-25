import { describe, expect, it } from 'vitest';
import { familyChildren, isSelfChild } from './children-list';

const kid = (id: string, self = false) => ({
  id,
  code: `AB-000${id}`,
  name: id,
  tz: 'Asia/Riyadh',
  contact_is_self: self,
});

describe('a guardian who also studies (canvas Adult)', () => {
  it('lists their own row first, the children after in the API order', () => {
    const me = { students: [kid('1'), kid('2', true), kid('3')] };
    expect(familyChildren(me).map((s) => s.id)).toEqual(['2', '1', '3']);
    expect(me.students.map((s) => s.id)).toEqual(['1', '2', '3']);
  });

  it('names only a guardian\'s own row «أنا»', () => {
    expect(isSelfChild('guardian', kid('1', true))).toBe(true);
    expect(isSelfChild('guardian', kid('1'))).toBe(false);
    expect(isSelfChild('student', kid('1', true))).toBe(false);
  });
});
