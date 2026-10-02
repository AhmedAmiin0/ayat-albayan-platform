import type { Enums } from '@ab/db';

// Domain enums (docs/03 §2). Each mirrors a DB enum; `satisfies` breaks the build if one drifts.
export const LEAD_STATUSES = [
  'new',
  'contacted',
  'interested_no_slot',
  'trial_booked',
  'trial_done',
  'converted',
  'no_reply',
  'lost',
] as const satisfies readonly Enums<'lead_status'>[];
export const LEAD_SOURCES = [
  'facebook_ad',
  'instagram_ad',
  'whatsapp_direct',
  'referral',
  'other',
] as const satisfies readonly Enums<'lead_source'>[];
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
] as const satisfies readonly Enums<'lesson_status'>[];
export const SUBSCRIPTION_STATUSES = [
  'trial',
  'active',
  'paused',
  'expired',
  'unpaid',
] as const satisfies readonly Enums<'subscription_status'>[];
export const PROGRAMS = [
  'quran',
  'arabic',
  'islamic_studies',
] as const satisfies readonly Enums<'program'>[];
export const GRADES = [
  'excellent',
  'very_good',
  'good',
  'acceptable',
  'needs_review',
] as const satisfies readonly Enums<'grade'>[];
export const ATTENDANCES = [
  'on_time',
  'late',
  'excused',
  'absent',
] as const satisfies readonly Enums<'attendance'>[];
export const PACKAGE_SIZES = [
  'trial',
  '4',
  '8',
  '12',
  '16',
  '20',
  '28',
] as const satisfies readonly Enums<'package_size'>[];
export const GENDERS = ['male', 'female'] as const satisfies readonly Enums<'gender'>[];
export const STUDENT_STATUSES = [
  'trial',
  'active',
  'paused',
  'churned',
] as const satisfies readonly Enums<'student_status'>[];
export const TEACHER_STATUSES = [
  'active',
  'inactive',
] as const satisfies readonly Enums<'teacher_status'>[];
export const JOB_APPLICANT_STATUSES = [
  'new',
  'reviewing',
  'interview',
  'accepted',
  'rejected',
] as const satisfies readonly Enums<'job_applicant_status'>[];
export const SCHEDULE_RULE_STATUSES = [
  'active',
  'paused',
  'ended',
] as const satisfies readonly Enums<'schedule_rule_status'>[];
/** DB domain `lesson_duration` (minutes). */
export const DURATIONS = [30, 45, 60, 90] as const;
/** 0 = الأحد … 6 = السبت (docs/06; same as JS Date#getDay). */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export type LeadStatus = Enums<'lead_status'>;
export type LeadSource = Enums<'lead_source'>;
export type LessonStatus = Enums<'lesson_status'>;
export type SubscriptionStatus = Enums<'subscription_status'>;
export type Program = Enums<'program'>;
export type Grade = Enums<'grade'>;
export type Attendance = Enums<'attendance'>;
export type PackageSize = Enums<'package_size'>;
export type Gender = Enums<'gender'>;
export type StudentStatus = Enums<'student_status'>;
export type TeacherStatus = Enums<'teacher_status'>;
export type JobApplicantStatus = Enums<'job_applicant_status'>;
export type ScheduleRuleStatus = Enums<'schedule_rule_status'>;
export type Duration = (typeof DURATIONS)[number];
export type Weekday = (typeof WEEKDAYS)[number];
export * from './finance.js';
