// Sheet vocabulary → target enums. Texts are the distinct values found in the export (2026-10-02).
// Lookups go through normalizeArabic so spelling variants (أ/ا, ة/ه, ى/ي) match one entry.
import type { Enums } from '@ab/db';
import { normalizeArabic } from '@ab/shared';
import { teacherSlug } from '../keys.ts';
import { teacherDirectory } from './teachers.dir.ts';

// A3: known junk in teacher columns (cities) → null: the link is rejected and flagged.
const NOT_TEACHERS = new Set(['الفيوم', 'مصر'].map(normalizeArabic));
const TEACHER_TITLES = /^(?:الاستاذه|المعلمه|معلمه|ا\.)\s*:?\s*/;

/**
 * Free-text teacher → slug. string = matched; null = junk value (city); undefined = unknown text
 * (raise unknown_teacher). Accepts slugs, English names, and the directory's Arabic aliases
 * (teachers.dir.ts: cache/teachers.json, never in git) with or without a title.
 */
export function teacherFromText(raw: string | null): string | null | undefined {
  if (!raw) return undefined;
  const dir = teacherDirectory();
  const slug = teacherSlug(raw);
  if (slug in dir.names) return slug;
  const ar = normalizeArabic(raw).replace(TEACHER_TITLES, '').trim();
  if (NOT_TEACHERS.has(ar)) return null;
  return dir.aliases[ar];
}

export function lookup<T>(table: Record<string, T>): (raw: string | null) => T | undefined {
  const norm = new Map(Object.entries(table).map(([k, v]) => [normalizeArabic(k), v]));
  return (raw) =>
    raw
      ? norm.get(
          normalizeArabic(raw)
            .replace(/[,،]+$/, '')
            .trim(),
        )
      : undefined;
}

/** «كل المحادثات» / «الردود الجاهزة» status. 'job_applicant' → job_applicants; 'skip' → not imported. */
export const sheetLeadStatus = lookup<Enums<'lead_status'> | 'job_applicant' | 'skip'>({
  'مهتم بدون ميعاد': 'interested_no_slot',
  'حجز مؤكد': 'trial_booked',
  'حجز مبدئي – بانتظار تأكيد': 'trial_booked',
  مردّش: 'no_reply',
  'عميل ضايع / اعتذر': 'lost',
  'توظيف / عرض خدمة': 'job_applicant',
  'جروب حلقة': 'skip',
});

/** «المصدر» / «عرفت عننا منين؟». 'skip' = internal rows (جروب حلقة, داخلي). */
export const leadSource = lookup<Enums<'lead_source'> | 'skip'>({
  'إعلان فيسبوك': 'facebook_ad',
  'إعلان انستجرام': 'instagram_ad',
  واتساب: 'whatsapp_direct',
  'واتساب مباشر': 'whatsapp_direct',
  'صديق أو معرفة': 'referral',
  'طالبات مشتركات': 'referral',
  'طالبة حالية': 'referral',
  إعلان: 'other',
  داخلي: 'skip',
});

export const attendance = lookup<Enums<'attendance'>>({
  'حضرت في الموعد': 'on_time',
  'حضرت متأخرة': 'late',
  'اعتذرت مسبقًا': 'excused',
  غابت: 'absent',
});

export const grade = lookup<Enums<'grade'>>({
  ممتاز: 'excellent',
  'جيد جدًا': 'very_good',
  'جيد جدا': 'very_good',
  جيد: 'good',
  مقبول: 'acceptable',
  'يحتاج مراجعة': 'needs_review',
});

export const program = lookup<Enums<'program'>>({
  'القرآن الكريم': 'quran',
  'تحفيظ وتجويد': 'quran',
  'اللغة العربية': 'arabic',
});

export const gender = lookup<Enums<'gender'>>({
  أنثى: 'female',
  معلمة: 'female',
  ذكر: 'male',
  معلم: 'male',
});

/** «الباقة المطلوبة» / «نوع الحلقة». Unlisted texts (170 دينار / 16 حلقة, نظام جماعي …) → review. */
export const packageSize = lookup<Enums<'package_size'>>({
  'حلقة تجريبية مجانية بس': 'trial',
  'حلقة تجريبية مجانية': 'trial',
  '4 حلقات في الشهر': '4',
  '8 حلقات في الشهر': '8',
  '12 حلقة في الشهر': '12',
  '16 حلقة في الشهر': '16',
  '16 حصة': '16',
});
