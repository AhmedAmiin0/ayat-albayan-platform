// SUBS, HEART, and the 60 per-student attendance workbooks (ATT-*). FIN: headers.fin.ts.
import { HEART_FILE, SUBS_FILE } from './headers.common.ts';
import type { SheetSpec } from './headers.ts';

const TIMETABLE = {
  Customers: 'name',
  sat: 'sat',
  sun: 'sun',
  mon: 'mon',
  tue: 'tue',
  wed: 'wed',
  thu: 'thu',
  fri: 'fri',
};

export const MONEY_SHEETS: SheetSpec[] = [
  {
    // 61 students; A3: «المعلمة» holds cities (الفيوم, مصر) and title variants; 39 empty.
    id: 'subs_students',
    source: 'SUBS',
    file: SUBS_FILE,
    tab: 'الطلاب',
    headerRow: 1,
    fields: {
      'اسم الطالب': 'student_name',
      المعلمة: 'teacher',
      البرنامج: 'program',
      'تاريخ أول حلقة': 'first_lesson_date', // A6: one row in 2029
      'آخر حلقة': 'last_lesson_date',
      'عدد الحلقات': 'lessons_count',
      'مجلد الطالب': 'folder_link',
      'سجل الحضور': 'attendance_sheet_link',
    },
  },
  {
    // Row 1 «Customers» title; header on row 2. Lectures = used, Sub = remaining (docs/06).
    id: 'heart_subscriptions',
    source: 'HEART',
    file: HEART_FILE,
    tab: 'subscription',
    headerRow: 2,
    fields: {
      Name: 'name',
      Phone: 'phone',
      Date: 'date',
      Lectures: 'lessons_used',
      Status: 'paid_status', // Paid · Not paid
      Sub: 'lessons_remaining',
      Teacher: 'teacher', // Abrar · Rabia · Hend · Hassan
    },
  },
  // Weekly timetables: one tab per teacher, day cells hold a start time (wall clock).
  {
    id: 'heart_abrar',
    source: 'HEART',
    file: HEART_FILE,
    tab: 'ABRAR',
    headerRow: 1,
    fields: TIMETABLE,
  },
  {
    id: 'heart_rabia',
    source: 'HEART',
    file: HEART_FILE,
    tab: 'RABIA',
    headerRow: 1,
    fields: TIMETABLE,
  },
  {
    id: 'heart_hend',
    source: 'HEART',
    file: HEART_FILE,
    tab: 'HEND',
    headerRow: 1,
    fields: TIMETABLE,
  },
  {
    // 60 files «تقارير آيات البيان/<student>/سجل حضور — <student>.xlsx». ref.file = the zip path.
    id: 'att_attendance',
    source: 'ATT',
    file: /^تقارير آيات البيان\/[^/]+\/[^/]+\.xlsx$/,
    tab: 'الحضور',
    headerRow: 1,
    fields: {
      'تاريخ الحلقة': 'lesson_date',
      'رقم الحلقة': 'lesson_number_text',
      المعلمة: 'teacher',
      البرنامج: 'program',
      الحضور: 'attendance',
      التسميع: 'recited',
      'الحفظ الجديد': 'new_memorization',
      المراجعة: 'revision',
      'التقدير العام': 'grade_overall',
      'ملاحظات المعلمة': 'notes',
      الواجب: 'homework',
      'رابط الاجتماع': 'meeting_link',
      'تقرير PDF': 'pdf_link',
    },
  },
];
