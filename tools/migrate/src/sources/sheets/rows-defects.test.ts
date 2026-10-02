// A4 sibling split and A6 test rows on invented values.
import { describe, expect, it } from 'vitest';
import { cleanName, splitSiblings } from './siblings.ts';
import { DUMMY_PHONES, cellsOf, testReason } from './test-rows.ts';

describe('splitSiblings (A4)', () => {
  it.each([
    ['ريم وجنى', ['ريم', 'جنى']],
    ['ريم و جنى', ['ريم', 'جنى']],
    ['جنى وريم', ['جنى', 'ريم']],
    ['Reem & Jana', ['Reem', 'Jana']],
    ['ريم، جنى، سلمى', ['ريم', 'جنى', 'سلمى']],
    ['عبد الحكيم و يونس', ['عبد الحكيم', 'يونس']],
  ])('%s → %j', (raw, out) => {
    expect(splitSiblings(raw)).toEqual(out);
  });

  it('keeps one person: a mother kunya, «و» first names, long names', () => {
    expect(splitSiblings('ام جنى وريم')).toEqual(['ام جنى وريم']);
    expect(splitSiblings('أم سلمى')).toEqual(['أم سلمى']);
    expect(splitSiblings('محمد وليد')).toEqual(['محمد وليد']);
    expect(splitSiblings('سلمى وعد')).toEqual(['سلمى وعد']);
    expect(splitSiblings('سلمى محمد وريم')).toEqual(['سلمى محمد وريم']);
    expect(splitSiblings('هالة')).toEqual(['هالة']);
  });

  it('drops a trailing count or age in brackets', () => {
    expect(cleanName('دانة أحمد (12)')).toBe('دانة أحمد');
    expect(splitSiblings('ريم وجنى (2)')).toEqual(['ريم', 'جنى']);
  });
});

describe('testReason (A6)', () => {
  it('flags Lorem rows in any cell but links', () => {
    expect(testReason({ names: ['Minus ipsum est rep'] })).toBe('lorem');
    expect(testReason({ names: ['ليان'], other: ['Laborum Recusandae'] })).toBe('lorem');
    expect(testReason({ names: ['ليان'], other: ['Sit quam veniam ips'] })).toBe('lorem');
    expect(testReason({ names: ['ليان'], other: ['https://meet.google.com/test-abc'] })).toBeNull();
  });

  it('flags Arabic test markers in names only', () => {
    expect(testReason({ names: ['تجربة النظام TEST'] })).toBe('test_name');
    expect(testReason({ names: ['اختبار الرحلة'] })).toBe('test_name');
    expect(testReason({ names: ['نمنم'] })).toBe('test_name');
    expect(testReason({ names: ['أ. معلمة (تجربة)'] })).toBe('test_name');
    expect(testReason({ names: ['ليان'], other: ['اختبار الجزء الأول'] })).toBeNull();
    // «حلقة تجريبية» (the free trial) is not «تجربة».
    expect(testReason({ names: ['ليان'], other: ['حلقة تجريبية مجانية'] })).toBeNull();
  });

  it('flags the placeholder phones', () => {
    expect(DUMMY_PHONES.has('+966500000000')).toBe(true);
    expect(testReason({ names: ['ليان'], phone: '+966501234567' })).toBe('dummy_phone');
    expect(testReason({ names: ['ليان'], phone: '+966551110001' })).toBeNull();
  });

  it('cellsOf leaves out the listed free-text fields', () => {
    expect(cellsOf({ a: 'x', notes: 'lorem', b: null }, ['notes'])).toEqual(['x', null]);
  });
});
