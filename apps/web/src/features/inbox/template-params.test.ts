import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { template } from './inbox-fixture';
import { missingParams, paramFields, prefillParams, toParamsInput, urlButton } from './template-params';

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
      { slot: '1', label: t.inbox.composer.paramNames.student_names },
      { slot: '2', label: t.inbox.composer.paramNames.lesson_when },
    ]);
    expect(paramFields(template({ params: ['mystery'] }))).toEqual([{ slot: '1', label: 'المتغير 1' }]);
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
});
