import { describe, expect, it } from 'vitest';
import { senderName } from './sender-name';

const NAMES: ReadonlyMap<string, string> = new Map([
  ['p-t', 'أ. هدى'],
  ['p-g', ''],
  ['p-s', ' \t '],
  ['p-a', '  أم سارة '],
]);

describe('senderName: a blank name is no name', () => {
  it('a named profile: its name', () => {
    expect(senderName(NAMES, 'p-t', 'المعلم/ة')).toBe('أ. هدى');
  });

  it('an empty or whitespace-only name: the fallback (the role word)', () => {
    expect(senderName(NAMES, 'p-g', 'ولي الأمر')).toBe('ولي الأمر');
    expect(senderName(NAMES, 'p-s', 'الطالب')).toBe('الطالب');
  });

  it('no name row at all: the fallback', () => {
    expect(senderName(NAMES, 'p-x', 'مسؤول المتابعة')).toBe('مسؤول المتابعة');
    expect(senderName(NAMES, '', '')).toBe('');
  });

  it('spaces around a name are not shown', () => {
    expect(senderName(NAMES, 'p-a', 'مسؤول المتابعة')).toBe('أم سارة');
  });
});
