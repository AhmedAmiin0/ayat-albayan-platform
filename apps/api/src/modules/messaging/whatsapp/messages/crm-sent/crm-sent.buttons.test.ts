import type { Json } from '@ab/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { messageRow } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { FOOTER, sentViews } from './crm-sent.fakes';

// URL buttons of a CRM template, filled from what the driver sent (owner 2026-11-07).

const FAMILY = templateRow({
  key: 'lesson_reminder_meet',
  meta_name: 'lesson_reminder_meet',
  body_ar: 'منصتنا: {{1}} — {{2}}',
  buttons: [{ type: 'url', url: 'https://meet.jit.si/{{1}}', text: 'ادخل' }],
});
const FAMILY_COPY = {
  'lesson_reminder_meet:ar': [
    { type: 'HEADER', format: 'TEXT', text: 'تذكير بالحلقة' },
    { type: 'BODY', text: 'نص نظام CRM: حلقة {{1}} {{2}}' },
    { type: 'FOOTER', text: FOOTER },
    { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'ادخل الحلقة', url: 'https://meet.jit.si/{{1}}' }] },
  ],
};

const V2 = templateRow({
  key: 'teacher_new_student',
  meta_name: 'teacher_new_student',
  body_ar: 'طالب جديد {{1}}',
  params: ['student_names'],
  buttons: [],
});
const V2_COPY = {
  'teacher_lesson_v2:ar': [
    { type: 'BODY', text: 'أستاذ {{1}}: {{2}}' },
    {
      type: 'BUTTONS',
      buttons: [
        { type: 'URL', text: 'ادخل الحلقة', url: 'https://app.example/{{1}}' },
        { type: 'URL', text: 'تقرير الحلقة', url: 'https://app.example/{{1}}' },
      ],
    },
  ],
};

describe('MessageViews on a crm line: buttons', () => {
  beforeEach(() => vi.stubEnv('WA_PROVIDER', 'crm'));
  afterEach(() => vi.unstubAllEnvs());

  it('a family lesson_reminder_meet: the CRM text, header and button with the meeting code', async () => {
    const { views } = sentViews([FAMILY], FAMILY_COPY);
    const row = messageRow({ template_key: 'lesson_reminder_meet', template_params: { 1: 'سارة', 2: '5 م', button: 'ab-s1' } });
    const v = await views.view(row);
    expect(v.body).toBe('نص نظام CRM: حلقة سارة 5 م');
    expect(v.template).toEqual({
      header: { type: 'text', text: 'تذكير بالحلقة' },
      footer: FOOTER,
      buttons: [{ type: 'url', text: 'ادخل الحلقة', url: 'https://meet.jit.si/ab-s1' }],
    });
    const text = new URL(v.click_to_chat ?? 'x:').searchParams.get('text');
    expect(text).toBe(`نص نظام CRM: حلقة سارة 5 م\n\nhttps://meet.jit.si/ab-s1\n\n${FOOTER}`);
  });

  it('teacher_new_student → teacher_lesson_v2: crm.body and each crm.buttons suffix by index', async () => {
    const { views } = sentViews([V2], V2_COPY);
    const crm = { body: ['محمد', 'تفاصيل'], buttons: ['classroom/L1', 'teacher/report/L1'] };
    const v = await views.view(messageRow({ template_key: 'teacher_new_student', template_params: { 1: 'طالب', crm } as Json }));
    expect(v.body).toBe('أستاذ محمد: تفاصيل');
    expect(v.template?.buttons.map((b) => b.url)).toEqual(['https://app.example/classroom/L1', 'https://app.example/teacher/report/L1']);
  });
});
