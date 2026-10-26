// HUB «نظام تسجيل الطلاب» people tabs. A repeated header gets " 2", " 3" (A9: the form changed shape).
import { HUB_FILE } from './headers.common.ts';
import type { SheetSpec } from './headers.ts';

const hub = (o: Omit<SheetSpec, 'source' | 'file' | 'headerRow'>): SheetSpec => ({
  source: 'HUB',
  file: HUB_FILE,
  headerRow: 1,
  ...o,
});

export const HUB_PEOPLE: SheetSpec[] = [
  hub({
    id: 'hub_registrations',
    tab: 'ردود التسجيل',
    fields: {
      Timestamp: 'submitted_at',
      'اسم الطالب': 'student_name',
      'رقم الواتساب (مع كود الدولة)': 'phone',
      'سن الطالب': 'age',
      النوع: 'gender', // أنثى · ذكر
      الدولة: 'country',
      المدينة: 'city',
      'بتملا الاستمارة بصفتك': 'filled_by',
      'اسم ولي الأمر': 'guardian_name',
      'صلة القرابة بالطالب': 'guardian_relation',
      'رقم تواصل بديل': 'alt_phone',
      'المستوى الحالي في القراءة': 'level',
      'الطالب حافظ قد إيه؟': 'memorized',
      'الهدف من الاشتراك': 'goal',
      'الرواية المطلوبة': 'riwaya',
      'الأيام المتاحة': 'available_days',
      'وقت البدء': 'start_time_v1', // older form version
      'الدولة / التوقيت اللي هتحضر بيه': 'tz_country',
      'الباقة المطلوبة': 'package_text',
      المده: 'duration_v1', // empty in every row
      'وقت البدء 2': 'start_time',
      'المده 2': 'duration_text', // «45 دقيقة»
      الساعه: 'hour',
      'تاريخ اول حصه': 'first_lesson_date',
      'المعلم/المعلمه': 'teacher', // already a slug: hassan, hend, abrar …
      'عرفت عننا منين؟': 'source',
      'نوع الحلقة': 'group_kind', // فردي · جماعي
      'عرفت عننا منين؟ 2': 'source_v2',
      'ملاحظات أو طلبات خاصة': 'notes',
      'معرّف الطالب': 'legacy_code',
    },
    ignore: [
      'Column 19',
      'Column 19 2',
      'Column 19 3',
      'Column 20',
      'Column 21',
      'Column 22',
      'Column 23',
    ],
  }),
  hub({
    id: 'hub_students',
    tab: 'الطلاب',
    fields: {
      'معرّف الطالب': 'legacy_code', // AB-nnnn → students.code_seq (OVERRIDING SYSTEM VALUE)
      'تاريخ التسجيل': 'registered_at',
      'اسم الطالب': 'student_name',
      'رقم الواتساب': 'phone',
      السن: 'age',
      النوع: 'gender',
      الدولة: 'country',
      المدينة: 'city',
      'صفة المُسجِّل': 'filled_by',
      'اسم ولي الأمر': 'guardian_name',
      'صلة القرابة': 'guardian_relation',
      'رقم تواصل بديل': 'alt_phone',
      'المستوى الحالي': 'level',
      المحفوظ: 'memorized',
      الهدف: 'goal',
      الرواية: 'riwaya',
      'الأيام المتاحة': 'available_days',
      'الوقت المفضل': 'preferred_time',
      التوقيت: 'tz_country',
      الباقة: 'package_text',
      'نوع الحلقة': 'group_kind',
      المصدر: 'source', // «إعلان فيسبوك,» — multi-select, trailing comma
      ملاحظات: 'notes',
      المعلم: 'teacher', // slug
      الحالة: 'status', // «جديد — لسه ما اتواصلناش» · «طالب حالي»
      'آخر تحديث': 'updated_at',
    },
  }),
  hub({
    id: 'hub_teachers',
    tab: 'المعلمين',
    fields: {
      'معرّف المعلم': 'legacy_id', // M-01 … M-11
      'اسم المعلم': 'name_en', // English names → keys.teacher slugs (teachers.dir.ts)
      'رقم التواصل': 'phone', // digits without + (docs/06: prefix +)
      النوع: 'gender', // معلمة · معلم
      التخصص: 'specialty', // تحفيظ وتجويد → programs {quran}
      'الأيام المتاحة': 'available_days',
      الحالة: 'status', // نشط → active
      ملاحظات: 'notes',
      'رابط Google Meet': 'meeting_link',
    },
  }),
  hub({
    id: 'hub_job_replies',
    tab: 'ردود التوظيف',
    fields: { الاسم: 'name', الرقم: 'phone', الرسالة: 'message' },
    ignore: ['ابعت', 'اتبعت؟'], // send buttons
  }),
];
