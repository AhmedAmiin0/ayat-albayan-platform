import { describe, expect, it } from 'vitest';
import { CRM_DEFAULT_NAMES, CRM_GATED_KEYS, gateApprovedKeys } from './crm-names.js';

// docs/19 «crm driver»: on a crm line teacher_new_student is approved by its own row OR the CRM
// template it goes as (teacher_lesson_v2); any other key, and a meta / kapso line, by its own.

interface Row {
  key: string;
  meta_name: string;
  language: string;
  status: string;
  crm_name?: string | null;
}
const row = (key: string, status: string, over: Partial<Row> = {}): Row =>
  ({ key, meta_name: key, language: 'ar', status, ...over });
const OWN = row('teacher_new_student', 'not_submitted');
const V2 = row('teacher_lesson_v2', 'approved');
const crm = () => true;
const meta = () => false;

describe('gateApprovedKeys', () => {
  it('reuses CRM_DEFAULT_NAMES: the only gated key is teacher_new_student → teacher_lesson_v2', () => {
    expect(CRM_GATED_KEYS).toEqual(['teacher_new_student']);
    expect(CRM_DEFAULT_NAMES.teacher_new_student).toBe('teacher_lesson_v2');
  });

  it('crm line: teacher_new_student approved by teacher_lesson_v2, whatever its own status', () => {
    expect(gateApprovedKeys([OWN, V2], crm)).toEqual(new Set(['teacher_new_student', 'teacher_lesson_v2']));
    expect(gateApprovedKeys([OWN, { ...V2, status: 'missing' }], crm)).toEqual(new Set());
  });

  it('crm line: a hand-approved teacher_new_student stays approved, read with or without v2', () => {
    const own = { ...OWN, status: 'approved' };
    expect(gateApprovedKeys([own, { ...V2, status: 'missing' }], crm).has('teacher_new_student')).toBe(true);
    expect(gateApprovedKeys([own], crm).has('teacher_new_student')).toBe(true);
  });

  it('crm line: the CRM template found by meta_name too; an admin crm_name is followed', () => {
    const imported = row('crm_v2', 'approved', { meta_name: 'teacher_lesson_v2' });
    expect(gateApprovedKeys([OWN, imported], crm).has('teacher_new_student')).toBe(true);
    const named = { ...OWN, crm_name: 'teacher_alert_x' };
    expect(gateApprovedKeys([named, V2], crm).has('teacher_new_student')).toBe(false);
    expect(gateApprovedKeys([named, row('teacher_alert_x', 'approved')], crm).has('teacher_new_student')).toBe(true);
  });

  it('crm line without the CRM template\'s row: its own hand-set status', () => {
    expect(gateApprovedKeys([OWN], crm)).toEqual(new Set());
    expect(gateApprovedKeys([{ ...OWN, status: 'approved' }], crm)).toEqual(new Set(['teacher_new_student']));
  });

  it('meta / kapso line: own status only', () => {
    expect(gateApprovedKeys([OWN, V2], meta)).toEqual(new Set(['teacher_lesson_v2']));
  });

  it('other CRM-mapped keys keep their own status on a crm line', () => {
    const meet = row('teacher_lesson_reminder_meet', 'missing');
    const reminder = row('teacher_lesson_reminder', 'approved');
    expect(gateApprovedKeys([meet, reminder], crm)).toEqual(new Set(['teacher_lesson_reminder']));
  });
});
