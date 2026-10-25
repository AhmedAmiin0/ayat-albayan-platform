import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { template } from '../../testing/inbox-fixture';
import { forAudience, lessonValues, missingParams, paramFields, prefillParams, toParamsInput, urlButton } from './template-params';

const jitsi = template({
  key: 'booking_confirmation',
  buttons: [{ type: 'url', url: 'https://meet.jit.si/{{1}}' }],
});
const followUp = template({
  key: 'follow_up_slots',
  params: ['slot_1', 'slot_2', 'tz_city'],
  buttons: [{ type: 'quick_reply', text: 'وقف الرسايل', intent: 'stop' }],
});

describe('template composer params (R-LEAD-02)', () => {
  it('labels each variable by its name, else «المتغير n»', () => {
    expect(paramFields(jitsi)).toEqual([
      { slot: '1', label: t.inbox.composer.paramNames.student_names, fromLesson: false },
      { slot: '2', label: t.inbox.composer.paramNames.lesson_when, fromLesson: true },
    ]);
    expect(paramFields(template({ params: ['mystery'] }))).toEqual([{ slot: '1', label: 'المتغير 1', fromLesson: false }]);
    expect(paramFields(followUp).map((f) => f.slot)).toEqual(['1', '2', '3']);
  });

  it('only a URL button with {{1}} needs a suffix', () => {
    expect(urlButton(jitsi)).toBe('https://meet.jit.si/{{1}}');
    expect(urlButton(followUp)).toBeNull();
    expect(urlButton(template({ buttons: [{ type: 'url', url: 'https://ayatalbayan.com' }] }))).toBeNull();
  });

  it('prefills the student or teacher name; lesson times stay for the admin', () => {
    expect(prefillParams(jitsi, { studentName: ' سهيلة ' })).toEqual({ '1': 'سهيلة' });
    expect(prefillParams(jitsi, { studentName: null })).toEqual({});
    expect(prefillParams(template({ params: ['teacher_name', 'lesson_slot'] }), { teacherName: 'أبرار' })).toEqual({
      '1': 'أبرار',
    });
  });

  it('prefills contact_name with the thread display name (trial_reschedule)', () => {
    const reschedule = template({ key: 'trial_reschedule', params: ['contact_name'] });
    expect(prefillParams(reschedule, { contactName: ' أم سهيلة ' })).toEqual({ '1': 'أم سهيلة' });
    expect(prefillParams(reschedule, { contactName: null, studentName: 'سهيلة' })).toEqual({});
    expect(paramFields(reschedule)[0]?.label).toBe('اسم المُرسَل إليه');
  });

  it('every variable and the button suffix are required', () => {
    expect(missingParams(jitsi, { '1': 'سهيلة' })).toEqual(['2', 'button']);
    expect(missingParams(jitsi, { '1': 'سهيلة', '2': ' ', button: 'room' })).toEqual(['2']);
    expect(missingParams(followUp, { '1': 'a', '2': 'b', '3': 'الرياض' })).toEqual([]);
  });

  it('sends trimmed values for the template’s own slots only', () => {
    expect(toParamsInput(jitsi, { '1': ' سهيلة ', '2': 'الأحد', '3': 'extra', button: ' room ' })).toEqual({
      '1': 'سهيلة',
      '2': 'الأحد',
      button: 'room',
    });
    expect(toParamsInput(followUp, { '1': 'a', button: 'x' })).toEqual({ '1': 'a' });
  });

  it('a picked lesson fills its time (recipient tz), names and the matching meeting code', () => {
    const lesson = { id: 'l1', starts_at: '2026-10-04T14:00:00Z', meeting_link: 'https://meet.jit.si/ab-x', student_names: ['سهيلة', 'مريم'], tz: 'Africa/Cairo' };
    expect(lessonValues(jitsi, lesson)).toEqual({ '1': 'سهيلة ومريم', '2': 'الأحد 4 أكتوبر 17:00', button: 'ab-x' });
    const meet = template({ buttons: [{ type: 'url', url: 'https://meet.google.com/{{1}}' }] });
    expect(lessonValues(meet, lesson).button).toBeUndefined();
  });

  it('teacher templates only on a teacher’s thread, and a teacher gets only those', () => {
    expect(forAudience(template({ key: 'teacher_lesson_reminder' }), true)).toBe(true);
    expect(forAudience(template({ key: 'teacher_lesson_reminder' }), false)).toBe(false);
    expect(forAudience(jitsi, false)).toBe(true);
    expect(forAudience(jitsi, true)).toBe(false);
  });

  it('a starter imported from Meta: var_1…var_4 → four «المتغير n» fields, all required, all sent', () => {
    const imported = template({ key: 'academy_welcome', params: ['var_1', 'var_2', 'var_3', 'var_4'], line: 'chat', sales_starter: true });
    const param = (n: string) => t.inbox.composer.param.replace('{n}', n);
    expect(paramFields(imported).map((f) => f.label)).toEqual(['1', '2', '3', '4'].map(param));
    expect(missingParams(imported, { '1': 'a', '2': 'b' })).toEqual(['3', '4']);
    expect(toParamsInput(imported, { '1': 'a', '2': 'b', '3': 'c', '4': ' d ' })).toEqual({ '1': 'a', '2': 'b', '3': 'c', '4': 'd' });
  });
});
