import type { MetaLineEnv } from '../../../../../config/env/env';
import { STUB_ENV, templateRow } from '../../whatsapp.fakes';

// Test-only (excluded from the build). The four templates migration 141 seeds as not_submitted,
// copied byte for byte (template-review.test.ts checks them against the SQL), and the Resumable
// Upload answers recorded from tools/wa-stub on 2026-10-02 (`createStub` + real HTTP).

export const APP_ENV: MetaLineEnv = { ...STUB_ENV, appId: 'stub-app' };

const FOOTER = 'أكاديمية آيات البيان';
const fresh = { status: 'not_submitted', footer_ar: FOOTER } as const;

export const REPORT_READY_SEED = templateRow({
  ...fresh,
  key: 'report_ready',
  meta_name: 'report_ready',
  header_format: 'document',
  params: ['student_name', 'lesson_when'],
  buttons: [],
  body_ar: `السلام عليكم ورحمة الله 🌿
ده تقرير حلقة {{1}} يوم {{2}} — فيه التسميع والحفظ الجديد والمراجعة وملاحظات الحلقة والواجب الجاي.
بارك الله فيكم على المتابعة.`,
});

export const RENEWAL_DUE_SEED = templateRow({
  ...fresh,
  key: 'renewal_due',
  meta_name: 'renewal_due',
  params: ['student_name', 'remaining_label'],
  buttons: [],
  body_ar: `السلام عليكم ورحمة الله 🌿
حابين نطمّنكم على باقة {{1}}: {{2}}.
لو حابين تجددوا عشان الحلقات تفضل ماشية في مواعيدها، ابعتولنا هنا ونرتّب معاكم.`,
});

const FOLLOW_UP_SLOTS_SEED = templateRow({
  ...fresh,
  key: 'follow_up_slots',
  meta_name: 'follow_up_slots',
  category: 'marketing',
  params: ['slot_1', 'slot_2', 'tz_city'],
  buttons: [{ type: 'quick_reply', text: 'وقف الرسايل', intent: 'stop' }],
  body_ar: `السلام عليكم ورحمة الله 🌿
ما حبيت أثقل عليك — لسه محتفظين لك بحلقتك التجريبية المجانية.
الحلقة أونلاين، وأول حلقة تجريبية ومجانية بالكامل، وبعد كل حلقة بنبعت تقرير مفصّل عن مستوى الطالب.
متاح عندنا:
🔹 {{1}}
🔹 {{2}}
المواعيد بتوقيت {{3}}.
أي موعد أنسب؟ رد علينا هنا وأثبّت الحجز فورًا.`,
});

const REMINDER_24H_SEED = templateRow({
  ...fresh,
  key: 'lesson_reminder_24h',
  meta_name: 'lesson_reminder_24h',
  params: ['student_names', 'lesson_time'],
  buttons: [
    { type: 'quick_reply', text: 'تمام، هنحضر', intent: 'confirm' },
    { type: 'quick_reply', text: 'محتاجين نغيّر الميعاد', intent: 'reschedule' },
  ],
  body_ar: `السلام عليكم ورحمة الله 🌿
تذكير: حلقة {{1}} بكرة — {{2}} إن شاء الله.
لو الميعاد مش مناسب رد علينا هنا ونظبط ميعاد تاني.`,
});

export const SEEDS = [REPORT_READY_SEED, RENEWAL_DUE_SEED, FOLLOW_UP_SLOTS_SEED, REMINDER_24H_SEED];

export const RECORDED_UPLOAD = {
  session: { status: 200, body: { id: 'upload:8343d89e280548838554f260de294898?sig=stub277cd412' } },
  handle: { status: 200, body: { h: '4::YXBwbGljYXRpb24vcGRmOjgzNDNkODllMjgwNTQ4ODM4NTU0ZjI2MGRlMjk0ODk4' } },
  createDoc: { status: 200, body: { id: '11bad72e-dfc6-4b9f-977d-da4d78e93acb', status: 'PENDING', category: 'UTILITY' } },
  noHandle: {
    status: 400,
    body: {
      error: {
        message: '(#100) Invalid parameter',
        type: 'OAuthException',
        code: 100,
        error_data: { messaging_product: 'whatsapp', details: 'component of type HEADER is missing expected field(s) (example.header_handle)' },
        fbtrace_id: 'stub-3a88d548',
      },
    },
  },
} as const;
