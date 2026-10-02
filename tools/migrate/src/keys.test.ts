// Invented, anonymised fixtures only (no real rows).
import { describe, expect, it } from 'vitest';
import { keyId, keys, personName, teacherSlug } from './keys.ts';

describe('personName', () => {
  it('unifies spelling variants (A1)', () => {
    expect(personName('نُورَة')).toBe(personName('نوره'));
    expect(personName('خديجة')).toBe('خديجه');
  });
  it('drops honorifics but keeps أم', () => {
    expect(personName('الأستاذة : ام ليلى')).toBe('ام ليلي');
    expect(personName('أ. مريم')).toBe('مريم');
    expect(personName('دكتورة  نور')).toBe('نور');
    expect(personName('الحاجة سعاد')).toBe('سعاد');
    expect(personName('أم ليلى')).toBe('ام ليلي');
  });
  it('strips stacked titles and quotes', () => {
    expect(personName('«الأستاذة: د. هبة»')).toBe('هبه');
  });
});

describe('keys', () => {
  it('teacher slug matches the sheet registry shape', () => {
    expect(teacherSlug(' Mariam  Adel ')).toBe('mariam adel');
    expect(keys.teacher('Abrar')).toEqual({ entity: 'teachers', key: 'abrar' });
  });

  it('student key = guardian phone + normalised name', () => {
    const a = keys.student({ guardianPhone: '+966500000001', name: 'نورة' });
    const b = keys.student({ guardianPhone: '+966500000001', name: 'نوره ' });
    expect(a).toEqual(b);
    expect(a.key).toBe('+966500000001|نوره');
    expect(keys.student({ guardianPhone: '+966500000002', name: 'نورة' })).not.toEqual(a);
  });

  it('rule and lesson keys ignore student order', () => {
    const one = keys.scheduleRule({ teacher: 'abrar', students: ['s2', 's1'] });
    const two = keys.scheduleRule({ teacher: 'abrar', students: ['s1', 's2'] });
    expect(one).toEqual(two);
    expect(keys.lesson({ teacher: 'hend', students: ['b', 'a'], at: '2026-09-01' }).key).toBe(
      'hend|a+b|2026-09-01',
    );
  });

  it('link-table and child keys embed their parents', () => {
    expect(keys.scheduleRuleStudent({ rule: 'r', student: 's' }).key).toBe('r|s');
    expect(keys.lessonStudent({ lesson: 'l', student: 's' })).toEqual({
      entity: 'lesson_students',
      key: 'l|s',
    });
    expect(keys.lessonReport({ lesson: 'l', student: 's' }).entity).toBe('lesson_reports');
    expect(keys.reportPdf('l|s')).toEqual({ entity: 'report_pdfs', key: 'l|s' });
  });

  it('money keys', () => {
    expect(keys.subscription({ student: 'p|n', startsOn: '2026-09-01' }).key).toBe(
      'p|n|2026-09-01',
    );
    expect(keys.payment({ subscription: 'x', paidOn: '2026-09-02', amount: 400 }).key).toBe(
      'x|2026-09-02|400',
    );
    expect(
      keys.expense({ month: '2026-08-01', category: 'ads', note: ' Meta  ADS ', amount: 50 }).key,
    ).toBe('2026-08-01|ads|meta ads|50');
  });

  it('people by phone, messages by wamid then crm id', () => {
    expect(keys.guardian('+201000000001').key).toBe('+201000000001');
    expect(keys.lead('+201000000001').entity).toBe('leads');
    expect(keys.jobApplicant('+201000000001').entity).toBe('job_applicants');
    expect(keys.message({ waMessageId: 'wamid.X', crmId: 'c1' }).key).toBe('wamid.X');
    expect(keys.message({ waMessageId: null, crmId: 'c1' }).key).toBe('crm:c1');
    expect(keys.messageTemplate(' booking_confirmation ').key).toBe('booking_confirmation');
  });

  it('keyId is entity-scoped', () => {
    expect(keyId(keys.lead('+201000000001'))).toBe('leads:+201000000001');
  });
});
