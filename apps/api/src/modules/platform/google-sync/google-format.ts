// The old Apps Script's exact output (docs/24 §1), kept byte for byte so the team, the script's
// manual dedupeCalendars / purgeJitsi and the existing sheets see the same shapes. These are a data
// format shared with Google (sheet headers are matched by the script), not UI copy: they are not in
// ar.json on purpose, so a translation override can never break the sheets. §2.3: the platform's
// own marker and footer replace the script's sheet line.

export const TZ = 'Asia/Riyadh';
export const POPUP_MINUTES = 30;

export const EVENT = {
  titlePrefix: 'حلقة — ',
  newStudent: 'طالب جديد',
  platformMarker: ' · المنصة',
  needsConfirmation: ' (يحتاج تأكيد)',
  link: 'لينك الحلقة: ',
  student: 'الطالب: ',
  studentPhone: 'رقم الطالب: ',
  trial: 'حلقة تجريبية — مرة واحدة بس',
  teacher: 'المعلم/ة: ',
  repeat: 'التكرار: ',
  kind: 'نوع الحلقة: ',
  status: 'الحالة: ',
  footer: 'مربوط تلقائيًا بمنصة آيات البيان — عدّل في المنصة مش هنا.',
  /** The start of the script's own sheet line: how the duplicate guard knows the script's event. */
  scriptFooter: 'مربوط تلقائيًا بتاب تقويم الحجوزات',
  onlineFallback: 'أونلاين — Zoom',
  kinds: { trial: 'حلقة تجريبية', makeup: 'حلقة تعويضية', package: 'اشتراك' },
} as const;

/** extendedProperties.private of every platform event: what proves an event is ours. */
export const PLATFORM_SOURCE = 'platform';

export const DRIVE = {
  rootFolder: 'تقارير آيات البيان',
  summarySheet: 'سجل الطلاب المشتركين',
  attendancePrefix: 'سجل حضور — ',
  pdfSeparator: ' — ',
  pdfPlatformSuffix: ' (المنصة)',
  calendarPrefix: 'آيات البيان — ',
} as const;

/** «سجل حضور — <student>»: 13 columns, A..M (the last is the PDF's Drive link). */
export const ATTENDANCE_HEADER = [
  'تاريخ الحلقة', 'رقم الحلقة', 'المعلمة', 'البرنامج', 'الحضور', 'التسميع', 'الحفظ الجديد',
  'المراجعة', 'التقدير العام', 'ملاحظات المعلمة', 'الواجب', 'رابط الاجتماع', 'تقرير PDF',
] as const;

/** «سجل الطلاب المشتركين»: 8 columns, A..H (G = the folder link, H = the attendance sheet link). */
export const SUMMARY_HEADER = [
  'اسم الطالب', 'المعلمة', 'البرنامج', 'تاريخ أول حلقة', 'آخر حلقة', 'عدد الحلقات', 'مجلد الطالب', 'سجل الحضور',
] as const;

/** Brand palette of «آيات البيان — الهوية (Brand)» styleSheet. */
export const BRAND = { green: '#0C2A1E', gold: '#C2A24A', paper: '#FDF8F0', white: '#FFFFFF' } as const;

export const MIME = {
  folder: 'application/vnd.google-apps.folder',
  sheet: 'application/vnd.google-apps.spreadsheet',
  pdf: 'application/pdf',
} as const;

/** The script removes any meet.jit.si link (purgeJitsi): the platform never writes one. */
export const isJitsi = (link: string): boolean => /meet\.jit\.si/i.test(link);
