import type { MetaLineEnv } from '../../../config/env/env';
import type { TemplateRow } from './whatsapp.types';

// Test-only (excluded from the build). Graph bodies recorded from tools/wa-stub on 2026-10-02
// (`createStub` + real HTTP), trimmed; registry rows as migration 141 seeds them. No real people.

export const STUB_ENV: MetaLineEnv = {
  base: 'http://127.0.0.1:4010',
  version: 'v21.0',
  phoneNumberId: 'stub-phone',
  wabaId: 'stub-waba',
  accessToken: 'test-token',
};

const metaErr = (code: number, message: string, details?: string) => ({
  error: {
    message: `(#${code}) ${message}`,
    type: 'OAuthException',
    code,
    ...(details ? { error_data: { messaging_product: 'whatsapp', details } } : {}),
    fbtrace_id: 'stub-0cc52f90',
  },
});

export const RECORDED = {
  sendOk: {
    status: 200,
    body: {
      messaging_product: 'whatsapp',
      contacts: [{ input: '966598917071', wa_id: '966598917071' }],
      messages: [{ id: 'wamid.d75640b5-fa48-4b20-bf51-8b9093173f42' }],
    },
  },
  templateMissing: {
    status: 404,
    body: metaErr(132001, 'Template name does not exist in the translation', 'template name (report_ready) does not exist in ar'),
  },
  windowClosed: {
    status: 400,
    body: metaErr(131047, 'Re-engagement message', 'More than 24 hours have passed since the recipient last replied'),
  },
  badToken: { status: 401, body: metaErr(190, 'Invalid OAuth access token') },
  templates: {
    status: 200,
    body: {
      data: [
        {
          id: 'a1d6d82d-ad18-4c74-b8ef-a35242561a7b',
          name: 'booking_confirmation',
          language: 'ar',
          category: 'UTILITY',
          status: 'APPROVED',
          quality_score: { score: 'GREEN' },
          components: [
            { type: 'BODY', text: 'تم حجز حلقة {{1}} — {{2}}' },
            { type: 'FOOTER', text: 'أكاديمية آيات البيان' },
            { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'ادخل الحلقة', url: 'https://meet.jit.si/{{1}}' }] },
          ],
        },
        {
          id: '9a7af34e-828f-4132-970c-fe5c19f7cfad',
          name: 'teacher_lesson_reminder',
          language: 'ar',
          category: 'UTILITY',
          status: 'APPROVED',
          quality_score: { score: 'GREEN' },
          components: [
            { type: 'BODY', text: 'أستاذ {{1}}، عندك حلقة {{2}}' },
            { type: 'FOOTER', text: 'أكاديمية آيات البيان' },
          ],
        },
      ],
      paging: { cursors: { before: 'stub', after: 'stub' } },
    },
  },
  createTemplate: { status: 200, body: { id: '964b3b49-13f6-4408-b518-23536278ea71', status: 'PENDING', category: 'UTILITY' } },
  read: { status: 200, body: { success: true } },
} as const;

export type Recorded = { status: number; body: unknown };

/** A fetch that answers from a script and records every request. */
export function scriptedFetch(...replies: (Recorded | Error)[]) {
  const requests: { url: string; init: RequestInit; body: unknown }[] = [];
  const fetch = async (url: string, init: RequestInit): Promise<Response> => {
    requests.push({ url, init, body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined });
    const reply = replies.shift();
    if (!reply) throw new Error(`unscripted request ${url}`);
    if (reply instanceof Error) throw reply;
    return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { 'content-type': 'application/json' } });
  };
  return { fetch, requests };
}

const BASE_ROW: TemplateRow = {
  key: 'booking_confirmation',
  meta_name: 'booking_confirmation',
  language: 'ar',
  category: 'utility',
  header_format: null,
  body_ar: 'تم حجز حلقة {{1}} — {{2}}',
  footer_ar: 'أكاديمية آيات البيان',
  params: ['student_names', 'lesson_when'],
  buttons: [{ type: 'url', url: 'https://meet.jit.si/{{1}}' }],
  display: null,
  status: 'approved',
  quality: null,
  meta_id: null,
  last_checked_at: null,
  last_error: null,
  submitted_at: null,
  updated_at: '2026-10-01T00:00:00Z',
  line: 'notifications',
  sales_starter: false,
  number_id: null,
  crm_name: null,
  crm_language: null,
};

export function templateRow(over: Partial<TemplateRow> = {}): TemplateRow {
  return { ...BASE_ROW, ...over };
}

export const REPORT_READY = templateRow({
  key: 'report_ready',
  meta_name: 'report_ready',
  header_format: 'document',
  body_ar: 'ده تقرير حلقة {{1}} يوم {{2}}',
  params: ['student_name', 'lesson_when'],
  buttons: [],
  status: 'not_submitted',
});

export const REMINDER_24H = templateRow({
  key: 'lesson_reminder_24h',
  meta_name: 'lesson_reminder_24h',
  body_ar: 'تذكير: حلقة {{1}} بكرة — {{2}}',
  params: ['student_names', 'lesson_time'],
  buttons: [
    { type: 'quick_reply', text: 'تمام، هنحضر', intent: 'confirm' },
    { type: 'quick_reply', text: 'محتاجين نغيّر الميعاد', intent: 'reschedule' },
  ],
  status: 'not_submitted',
});
