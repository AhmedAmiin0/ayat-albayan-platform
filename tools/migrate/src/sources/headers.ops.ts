// Bookings, conversations, reports, message bodies: HUB + BOOK + REP.
import {
  BOOK_FILE,
  BOOKING_FIELDS,
  CONVERSATION_FIELDS,
  HUB_FILE,
  REP_FILE,
  REPORT_FIELDS,
} from './headers.common.ts';
import type { SheetSpec } from './headers.ts';

export const OPS_SHEETS: SheetSpec[] = [
  {
    // PRIMARY report source: 134 rows ⊇ all 60 REP timestamps, and carries the PDF link (74 rows).
    id: 'hub_reports',
    source: 'HUB',
    file: HUB_FILE,
    tab: 'تقارير الحلقات',
    headerRow: 1,
    fields: {
      ...REPORT_FIELDS,
      'اسم المعلم (لا تعدله)': 'teacher_locked',
      'اسم الطالب (لا تعدله)': 'student_locked',
      'اسم الطالب (من السجل)': 'student_registry_name',
      'رقم الواتساب': 'phone',
      'المعلم (من السجل)': 'teacher_slug', // abrar, hend … when «حالة الربط» = «مربوط ✅»
      'حالة الربط': 'link_status',
      'إرسال للطالب': 'send_status', // «اتبعت PDF ✅ wamid…» → lesson_reports.sent_at known
      'رابط PDF': 'pdf_link', // Drive link; the PDF itself is in the zip (report_pdfs)
    },
  },
  {
    // Older copy of the same form (60 rows, all also in hub_reports). Cross-check only.
    id: 'rep_reports',
    source: 'REP',
    file: REP_FILE,
    tab: 'Form Responses 1',
    headerRow: 1,
    fields: { ...REPORT_FIELDS, 'Email Address': 'teacher_email', 'رقم واتساب ولي الأمر': 'phone' },
  },
  {
    // 21 rows, almost disjoint from BOOK (1 shared name+phone).
    id: 'hub_bookings',
    source: 'HUB',
    file: HUB_FILE,
    tab: 'تقويم الحجوزات',
    headerRow: 1,
    fields: { ...BOOKING_FIELDS, 'معرّف الطالب': 'legacy_code', المعلم: 'teacher' },
  },
  {
    // 285 rows (docs/06 «superset»). Status: يحتاج تأكيد 268 · مبدئي 6 · مؤكد 4 · ملغي 3 · مشترك 2 · تمت 2.
    id: 'book_bookings',
    source: 'BOOK',
    file: BOOK_FILE,
    tab: 'تقويم الحجوزات',
    headerRow: 1,
    fields: {
      ...BOOKING_FIELDS,
      'المعلم/ة': 'teacher', // English name → keys.teacher slug
      'تقويم المعلم/ة (لا تعدله)': 'teacher_calendar_id',
      'حدث الكلندر الرئيسي (لا تعدله)': 'main_calendar_event_id',
    },
  },
  {
    id: 'hub_conversations',
    source: 'HUB',
    file: HUB_FILE,
    tab: 'كل المحادثات',
    headerRow: 1,
    fields: { ...CONVERSATION_FIELDS, 'معرّف الطالب': 'legacy_code' },
  },
  {
    // Same phones as hub_conversations; leads come from the CRM first, these only fill gaps.
    id: 'book_conversations',
    source: 'BOOK',
    file: BOOK_FILE,
    tab: 'كل المحادثات',
    headerRow: 1,
    fields: CONVERSATION_FIELDS,
  },
  {
    id: 'book_teachers',
    source: 'BOOK',
    file: BOOK_FILE,
    tab: 'المعلمون',
    headerRow: 1,
    fields: {
      'اسم المعلم/ة': 'name_en',
      'إيميل جوجل': 'google_email',
      'معرّف التقويم (لا تعدله)': 'google_calendar_id', // → teachers.google_calendar_id
      'حالة المشاركة': 'share_status',
    },
  },
  {
    // Canned follow-up messages (bodies seed message_templates text; rows are leads too).
    id: 'hub_canned_replies',
    source: 'HUB',
    file: HUB_FILE,
    tab: 'الردود الجاهزة',
    headerRow: 1,
    fields: {
      الاسم: 'name',
      الرقم: 'phone',
      الحالة: 'status',
      المصدر: 'source',
      'الميعاد المقترح ١': 'slot_1',
      'الميعاد المقترح ٢': 'slot_2',
      الرسالة: 'message',
    },
    ignore: ['ابعت', 'اتبعت؟'],
  },
  {
    // Booking-confirmation bodies per lesson (template text source; meeting links per teacher).
    id: 'hub_lesson_links',
    source: 'HUB',
    file: HUB_FILE,
    tab: 'لينكات الحلقات',
    headerRow: 1,
    fields: {
      الاسم: 'name',
      الرقم: 'phone',
      التاريخ: 'date',
      الوقت: 'time',
      المعلم: 'teacher',
      'لينك الحلقة': 'meeting_link',
      'رسالة التأكيد': 'confirmation_message',
    },
    ignore: ['ابعت'],
  },
];
