import { describe, expect, it } from 'vitest';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { numberedParams, slotCount, templateByName } from './template-match';

// The script relay names a template by the CRM's name: which catalog row it is, and its values.

const NEW_STUDENT = templateRow({
  key: 'teacher_new_student',
  meta_name: 'teacher_new_student',
  body_ar: 'طالب جديد {{1}}',
});
const OLD_SCRIPT = templateRow({
  key: 'teacher_lesson_v2',
  meta_name: 'teacher_lesson_v2_meta',
  body_ar: '{{1}} {{2}} {{3}} {{4}}',
});
const CUSTOM = templateRow({ key: 'custom_key', meta_name: 'custom_meta', crm_name: 'crm_alias' });
const ROWS = [NEW_STUDENT, OLD_SCRIPT, CUSTOM];

describe('templateByName', () => {
  it('our key first', () => {
    expect(templateByName(ROWS, 'teacher_lesson_v2')?.key).toBe('teacher_lesson_v2');
  });

  it("then Meta's name, then the admin's CRM name", () => {
    expect(templateByName(ROWS, 'teacher_lesson_v2_meta')?.key).toBe('teacher_lesson_v2');
    expect(templateByName(ROWS, 'crm_alias')?.key).toBe('custom_key');
  });

  it('never a CRM default name: its body is not the script template\'s own', () => {
    expect(templateByName([NEW_STUDENT], 'teacher_lesson_v2')).toBeNull();
  });

  it('an unknown name is null', () => {
    expect(templateByName(ROWS, 'nothing_like_it')).toBeNull();
    expect(templateByName([], 'teacher_lesson_v2')).toBeNull();
  });
});

describe('slotCount / numberedParams', () => {
  it('the highest {{n}} of the body', () => {
    expect(slotCount('{{1}} و {{3}} ثم {{2}}')).toBe(3);
    expect(slotCount('بلا متغيرات')).toBe(0);
  });

  it('values in order as «1», «2», …', () => {
    expect(numberedParams(['أ', 'ب'], { body_ar: '{{1}} {{2}}' })).toEqual({ '1': 'أ', '2': 'ب' });
    expect(numberedParams([], { body_ar: 'ثابت' })).toEqual({});
  });

  it('a count that is not the template\'s own is null', () => {
    expect(numberedParams(['أ'], { body_ar: '{{1}} {{2}}' })).toBeNull();
    expect(numberedParams(['أ', 'ب', 'ج'], { body_ar: '{{1}} {{2}}' })).toBeNull();
  });
});
