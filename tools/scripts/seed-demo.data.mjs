// DEMO rows for local visual checks (R-NFR-04: seed data clearly marked). Never for prod.
// Markers: guardians/students/job_applicants.notes = DEMO_NOTE, teachers' English name ends in
// " (DEMO)", leads.qualification.demo = true. Phones are E.164 and fixed so re-runs upsert.
export const DEMO_NOTE = 'DEMO (pnpm seed:demo)';

const RATES = { rate_30: 60, rate_45: 85, rate_60: 110, rate_90: 160 };

/** availability: [weekday 0=الأحد … 6=السبت, start, end] in the teacher's tz. */
export const TEACHERS = [
  {
    ar: 'فاطمة الزهراء', en: 'Fatma Elzahraa', gender: 'female', programs: ['quran', 'islamic_studies'],
    phone: '+201066123049', link: 'https://meet.google.com/xqa-ngdu-fpe', tz: 'Africa/Cairo', status: 'active', max: 12, ...RATES,
    availability: [[6, '15:00', '18:00'], [6, '19:00', '22:00'], [0, '16:00', '21:00'], [1, '15:00', '18:00'], [2, '16:00', '21:00'], [4, '10:00', '13:00'], [4, '16:00', '19:00']],
    timeOff: { from: '2026-10-10T00:00:00+03:00', to: '2026-10-13T00:00:00+03:00', reason: 'سفر' },
  },
  {
    ar: 'محمود السيد', en: 'Mahmoud Elsayed', gender: 'male', programs: ['quran'],
    phone: '+201112345678', link: 'https://meet.google.com/mhd-sayd-qrn', tz: 'Africa/Cairo', status: 'active', max: 15, ...RATES,
    availability: [0, 1, 2, 3, 4].map((d) => [d, '17:00', '21:00']),
  },
  {
    ar: 'هبة عبد الرحمن', en: 'Heba Abdelrahman', gender: 'female', programs: ['arabic'],
    phone: '+201223344556', link: 'https://meet.google.com/hba-arbc-lng', tz: 'Africa/Cairo', status: 'active', max: 10, ...RATES,
    availability: [[6, '14:00', '18:00'], [1, '14:00', '18:00'], [3, '14:00', '18:00']],
  },
  {
    ar: 'خالد العتيبي', en: 'Khalid Alotaibi', gender: 'male', programs: ['quran'],
    phone: '+966551112233', link: null, tz: 'Asia/Riyadh', status: 'inactive', max: 8, ...RATES,
    availability: [],
  },
];

/** teacher: index into TEACHERS, or null (needs a teacher). */
export const FAMILIES = [
  { name: 'أم إيمان', phone: '+966552147730', country: 'SA', tz: 'Asia/Riyadh', source: 'facebook_ad', students: [
    { name: 'سهيلة محمد', age: 9, gender: 'female', program: 'quran', status: 'active', teacher: 0 },
    { name: 'إيمان محمد', age: 12, gender: 'female', program: 'quran', status: 'active', teacher: 0 },
  ] },
  { name: 'أبو يوسف', phone: '+966508731142', country: 'SA', tz: 'Asia/Riyadh', source: 'instagram_ad', students: [
    { name: 'يوسف أحمد', age: 7, gender: 'male', program: 'quran', status: 'trial', teacher: 1 },
  ] },
  { name: 'أم جودي', phone: '+201022348871', country: 'EG', tz: 'Africa/Cairo', source: 'referral', students: [
    { name: 'جودي خالد', age: 11, gender: 'female', program: 'arabic', status: 'active', teacher: 2 },
    { name: 'نور خالد', age: 8, gender: 'female', program: 'arabic', status: 'trial', teacher: 2 },
  ] },
  { name: 'أبو عبد الرحمن', phone: '+966544100927', country: 'SA', tz: 'Asia/Riyadh', source: 'whatsapp_direct', students: [
    { name: 'عبد الرحمن سامي', age: 13, gender: 'male', program: 'quran', status: 'paused', teacher: 1 },
    { name: 'سارة سامي', age: 10, gender: 'female', program: 'quran', status: 'active', teacher: 0 },
  ] },
  { name: 'مريم علي', phone: '+966563329084', country: 'SA', tz: 'Asia/Riyadh', source: 'facebook_ad', students: [
    { name: 'مريم علي', age: 24, gender: 'female', program: 'islamic_studies', status: 'active', teacher: 0 },
  ] },
  { name: 'أبو عمر', phone: '+97455123398', country: 'QA', tz: 'Asia/Qatar', source: 'facebook_ad', students: [
    { name: 'عمر حسام', age: 8, gender: 'male', program: 'quran', status: 'trial', teacher: null },
  ] },
  { name: 'أم ليان', phone: '+96891234410', country: 'OM', tz: 'Asia/Muscat', source: 'referral', students: [
    { name: 'ليان عبد الله', age: 10, gender: 'female', program: 'arabic', status: 'churned', teacher: 2 },
  ] },
  { name: 'أم أنس', phone: '+96565012345', country: 'KW', tz: 'Asia/Kuwait', source: 'instagram_ad', students: [
    { name: 'أنس طارق', age: 6, gender: 'male', program: 'quran', status: 'trial', teacher: 1 },
    { name: 'ريم طارق', age: 9, gender: 'female', program: 'quran', status: 'active', teacher: 1 },
  ] },
];

/** inboundMinutesAgo / outboundMinutesAgo relative to now; followUpHours from now. */
export const LEADS = [
  { phone: '+966551234001', name: 'أم سلمى', source: 'facebook_ad', status: 'new', inbound: 20 },
  { phone: '+966551234002', name: 'أبو فهد', source: 'instagram_ad', status: 'new', inbound: 130 },
  { phone: '+201001234003', name: 'منة الله', source: 'whatsapp_direct', status: 'new', inbound: 1500 },
  { phone: '+966551234004', name: 'أم رغد', source: 'facebook_ad', status: 'contacted', inbound: 300, outbound: 280 },
  { phone: '+966551234005', name: 'أبو زياد', source: 'referral', status: 'interested_no_slot', inbound: 2900, outbound: 2880, followUpHours: 18 },
  { phone: '+97455234006', name: 'أم حمزة', source: 'instagram_ad', status: 'trial_booked', inbound: 4400, outbound: 4300 },
  { phone: '+201001234007', name: 'هاجر محمود', source: 'facebook_ad', status: 'trial_done', inbound: 7200, outbound: 7000 },
  { phone: '+966551234008', name: 'أبو مالك', source: 'whatsapp_direct', status: 'converted', inbound: 12000, outbound: 11900 },
  { phone: '+966551234009', name: 'أم لين', source: 'facebook_ad', status: 'no_reply', inbound: 9000, outbound: 4000 },
  { phone: '+201001234010', name: 'أبو آدم', source: 'other', status: 'lost', inbound: 20000, outbound: 19000 },
];

export const APPLICANTS = [
  { phone: '+201099887766', name: 'نهى إبراهيم', status: 'new' },
  { phone: '+201155443322', name: 'يحيى زكريا', status: 'reviewing' },
  { phone: '+966559988771', name: 'أسماء الشهري', status: 'interview' },
];
