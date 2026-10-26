import { describe, expect, it } from 'vitest';
import { prefillParams } from './prefill.js';

const tpl = (params: string[]) => ({ params });

describe('prefillParams (R-LEAD-02)', () => {
  it('fills the student, teacher and contact names by variable name, trimmed', () => {
    expect(prefillParams(tpl(['student_names', 'lesson_when']), { studentName: ' سهيلة ' })).toEqual({ '1': 'سهيلة' });
    expect(prefillParams(tpl(['lesson_slot', 'student_name']), { studentName: 'مريم' })).toEqual({ '2': 'مريم' });
    expect(prefillParams(tpl(['teacher_name', 'lesson_slot']), { teacherName: 'أبرار' })).toEqual({ '1': 'أبرار' });
    expect(prefillParams(tpl(['contact_name']), { contactName: ' أم سهيلة ', studentName: 'سهيلة' })).toEqual({ '1': 'أم سهيلة' });
  });

  it('leaves out unknown, missing and blank values (lesson times stay for the picked lesson)', () => {
    expect(prefillParams(tpl(['student_names']), { studentName: null })).toEqual({});
    expect(prefillParams(tpl(['contact_name']), { contactName: '   ' })).toEqual({});
    expect(prefillParams(tpl(['lesson_when', 'var_1']), { studentName: 'سهيلة', contactName: 'هدى' })).toEqual({});
    expect(prefillParams(tpl([]), { contactName: 'هدى' })).toEqual({});
  });

  it('only the first nine variables have a slot', () => {
    const ten = [...Array.from({ length: 9 }, (_, i) => `var_${i + 1}`), 'contact_name'];
    expect(prefillParams(tpl(ten), { contactName: 'هدى' })).toEqual({});
    expect(prefillParams(tpl([...ten.slice(0, 8), 'contact_name']), { contactName: 'هدى' })).toEqual({ '9': 'هدى' });
  });
});
