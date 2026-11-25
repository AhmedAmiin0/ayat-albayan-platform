// Domain enums (docs/03 §2). Each mirrors a DB enum; the api's enum-parity tests catch drift.
export const LEAD_STATUSES = [
  'new',
  'contacted',
  'interested_no_slot',
  'trial_booked',
  'trial_done',
  'converted',
  'no_reply',
  'lost',
] as const;
export const LEAD_SOURCES = [
  'facebook_ad',
  'instagram_ad',
  'whatsapp_direct',
  'referral',
  'other',
] as const;
export const LESSON_STATUSES = [
  'scheduled',
  'confirmed',
  'completed',
  'late',
  'excused',
  'no_show',
  'cancelled_by_teacher',
  'cancelled_by_admin',
  'rescheduled',
] as const;
export const SUBSCRIPTION_STATUSES = [
  'trial',
  'active',
  'paused',
  'expired',
  'unpaid',
  'cancelled',
] as const;
export const PROGRAMS = [
  'quran',
  'arabic',
  'islamic_studies',
] as const;
export const GRADES = [
  'excellent',
  'very_good',
  'good',
  'acceptable',
  'needs_review',
] as const;
export const ATTENDANCES = [
  'on_time',
  'late',
  'excused',
  'absent',
] as const;
export const PACKAGE_SIZES = [
  'trial',
  '4',
  '8',
  '12',
  '16',
  '20',
  '28',
] as const;
export const GENDERS = ['male', 'female'] as const;
/** Display order everywhere: pills, filters, chips, selects. */
export const STUDENT_STATUSES = [
  'new',
  'trial',
  'pending_subscription',
  'active',
  'pending_renewal',
  'expired',
  'paused',
  'churned',
] as const;
export const TEACHER_STATUSES = [
  'active',
  'inactive',
] as const;
export const JOB_APPLICANT_STATUSES = [
  'new',
  'reviewing',
  'interview',
  'accepted',
  'rejected',
] as const;
export const SCHEDULE_RULE_STATUSES = [
  'active',
  'paused',
  'ended',
] as const;
/** DB domain `lesson_duration` (minutes). */
export const DURATIONS = [30, 45, 60, 90] as const;
/** 0 = Sunday to 6 = Saturday (docs/06; same as JS Date#getDay). */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type LeadSource = (typeof LEAD_SOURCES)[number];
export type LessonStatus = (typeof LESSON_STATUSES)[number];
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
export type Program = (typeof PROGRAMS)[number];
export type Grade = (typeof GRADES)[number];
export type Attendance = (typeof ATTENDANCES)[number];
export type PackageSize = (typeof PACKAGE_SIZES)[number];
export type Gender = (typeof GENDERS)[number];
export type StudentStatus = (typeof STUDENT_STATUSES)[number];
export type TeacherStatus = (typeof TEACHER_STATUSES)[number];
export type JobApplicantStatus = (typeof JOB_APPLICANT_STATUSES)[number];
export type ScheduleRuleStatus = (typeof SCHEDULE_RULE_STATUSES)[number];
export type Duration = (typeof DURATIONS)[number];
export type Weekday = (typeof WEEKDAYS)[number];
export * from './finance';
export * from './messaging';
export * from './feedback';
export * from './lead-transitions';
