import type { TemplateCreateInput } from './template-create.js';

// teacher_lesson_v3 (owner 2026-11-06): the teacher's lesson notice with two link buttons on our
// own domains. The meeting link is written in the text as well; the report link is a button only.
// Seeded by migration 20261106000800 (status not_submitted: the admin submits it from «القوالب»).

/** The join button's page: GET /join/<token> on the API (a signed, expiring 302 to the room). */
export const TEACHER_JOIN_BUTTON_URL = 'https://api.ayatalbayan.com/join/{{1}}';
/** The report button's page: the no-login report form of one lesson (/teacher-report/<token>). */
export const TEACHER_REPORT_BUTTON_URL = 'https://app.ayatalbayan.com/teacher-report/{{1}}';

/** {{1}}…{{6}} in order: the producer fills them (teacher-lesson.v3.ts in the API). */
export const TEACHER_LESSON_V3_PARAMS = [
  'teacher_name',
  'student_names',
  'student_codes',
  'lesson_when',
  'lesson_duration',
  'meeting_url',
] as const;

const BODY = [
  'السلام عليكم ورحمة الله وبركاته',
  'الأستاذ/ة {{1}}، تحية طيبة من أكاديمية آيات البيان.',
  'لديك حلقة مع: {{2}}',
  'كود الطالب: {{3}}',
  'الموعد بتوقيتك: {{4}}',
  'مدة الحلقة: {{5}}',
  'رابط الحلقة: {{6}}',
  'نرجو الدخول قبل الموعد بخمس دقائق عبر زر «ادخل الحلقة»، وتسجيل تقرير الحلقة بعد انتهائها عبر زر «تقرير الحلقة».',
  'وإذا طرأ ما يمنعك من حضور الحلقة، فنرجو الرد على هذه الرسالة.',
].join('\n');

const SAMPLES: Readonly<Record<(typeof TEACHER_LESSON_V3_PARAMS)[number], string>> = {
  teacher_name: 'أبرار',
  student_names: 'سهيلة ومريم',
  student_codes: 'AB-0101، AB-0102',
  lesson_when: 'الأحد 8 نوفمبر 5:00 م',
  lesson_duration: '30 دقيقة',
  meeting_url: 'https://meet.google.com/abc-defg-hij',
};

/** A token-shaped sample suffix for Meta's reviewer (never a real token). */
const SAMPLE_TOKEN = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA.BBBBBBBBBBBBBBBBBBBBBB';

/** The registry row as «قالب جديد» would take it (validated by templateCreateSchema in a test). */
export const TEACHER_LESSON_V3: TemplateCreateInput = {
  key: 'teacher_lesson_v3',
  line: 'notifications',
  category: 'utility',
  language: 'ar',
  header: null,
  body: BODY,
  footer: 'أكاديمية آيات البيان',
  params: TEACHER_LESSON_V3_PARAMS.map((name) => ({ name, sample: SAMPLES[name] })),
  buttons: [
    { type: 'url', text: 'ادخل الحلقة', url: TEACHER_JOIN_BUTTON_URL, example: SAMPLE_TOKEN },
    { type: 'url', text: 'تقرير الحلقة', url: TEACHER_REPORT_BUTTON_URL, example: SAMPLE_TOKEN },
  ],
};
