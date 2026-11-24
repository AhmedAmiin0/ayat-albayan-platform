// Column groups that appear in more than one workbook. Header texts are copied verbatim from the
// owner's export (2026-10-01); field names are what mappers read (SourceRow.fields).

export const HUB_FILE = 'أكاديمية آيات البيان — نسخة تجريبية (نظام تسجيل الطلاب).xlsx';
export const BOOK_FILE = 'أكاديمية آيات البيان — الحجوزات والمحادثات.xlsx';
export const REP_FILE = 'أكاديمية آيات البيان — سجل تقارير الحلقات.xlsx';
export const SUBS_FILE = 'تقارير آيات البيان/سجل الطلاب المشتركين.xlsx';
export const HEART_FILE = 'Ayat ALBayan Heart.xlsx';
export const FIN_FILE = 'Main income statment.xlsx';

/** The lesson report Google Form: HUB reports tab and REP "Form Responses 1". */
export const REPORT_FIELDS: Record<string, string> = {
  Timestamp: 'submitted_at',
  'معرّف الطالب (لا تعدله)': 'legacy_code', // A2: empty in every row
  'اسم المعلمة': 'teacher', // A3 free text → values.ts teacherFromText
  'اسم الطالب / الطالبة': 'student_name',
  'تاريخ الحلقة': 'lesson_date',
  'رقم الحلقة': 'lesson_number_text', // A5: ignored, numbering is derived (v_lesson_sequence)
  البرنامج: 'program', // Quran or Arabic
  الحضور: 'attendance', // values.ts attendance
  'رابط الاجتماع': 'meeting_link',
  'التسميع (المُسمَّع)': 'recited',
  'الحفظ الجديد': 'new_memorization',
  المراجعة: 'revision',
  'الدرس النظري / أحكام التجويد': 'theory',
  'تقييم البنود [التلاوة والنطق]': 'grade_recitation', // values.ts grade
  'تقييم البنود [الحفظ الجديد]': 'grade_memorization',
  'تقييم البنود [المراجعة]': 'grade_revision',
  'تقييم البنود [التجويد]': 'grade_tajweed',
  'تقييم البنود [الاستيعاب والتفاعل]': 'grade_engagement',
  'تقييم البنود [الالتزام والحضور]': 'grade_commitment',
  'التقدير العام للحلقة': 'grade_overall',
  'ملاحظات المعلمة': 'notes',
  'الواجب المطلوب قبل الحلقة القادمة': 'homework',
  'خطة الحلقة القادمة': 'next_plan',
  'المرفقات (اختياري)': 'attachments', // Drive links to attachment images
};

/** Bookings calendar (HUB and BOOK; each adds its own teacher columns). */
export const BOOKING_FIELDS: Record<string, string> = {
  الاسم: 'name', // A4: two children on one row
  الرقم: 'phone', // A8: 4 formats
  التاريخ: 'date',
  'وقت البداية': 'start_time',
  'المدة (دقيقة)': 'duration_min', // 30 · 45 · 60 · 90
  التكرار: 'recurrence', // weekly days with an until date; empty = one-off
  الحالة: 'status', // values.schedule.ts bookingStatus
  'نوع الحلقة': 'package_text', // values.ts packageSize
  ملاحظات: 'notes',
  'معرّف الحدث (لا تعدله)': 'calendar_event_id',
  'آخر مزامنة': 'synced_at',
  'عدد الطلاب': 'student_count',
};

/** The conversations tab (HUB and BOOK hold the same 107 phones). */
export const CONVERSATION_FIELDS: Record<string, string> = {
  التاريخ: 'date',
  اليوم: 'weekday',
  'رقم الواتساب': 'phone',
  الاسم: 'name',
  الحالة: 'status', // values.ts sheetLeadStatus
  'الميعاد المتفق عليه': 'agreed_slot',
  المصدر: 'source', // values.ts leadSource
  Summary: 'summary', // → leads.qualification.legacy_summary
};
