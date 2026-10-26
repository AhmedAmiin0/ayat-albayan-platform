// Job-seeker hint (R-LEAD-04) from a contact's first inbound texts. Flags the lead for the owner's
// review; never moves anyone to job_applicants. Patterns run on normalizeArabic text (ة→ه, أ→ا).
// Bare «معلمة» / «محفظة» are not enough: parents write «عايزة معلمة لبنتي». They count only as a
// self-description («انا محفظه») or next to work words.
// ponytail: keyword heuristic; precision unknown (no labelled CRM job seekers had matching texts).
import { normalizeArabic } from '@ab/shared';

const ROLE = '(?:معلم|معلمه|محفظ|محفظه|مدرس|مدرسه|مجاز|مجازه)';
const PATTERNS: Readonly<Record<string, RegExp>> = {
  self: new RegExp(`(?:^|\\s)(?:انا|اني|انني)\\s+${ROLE}(?:\\s|$)`),
  job: /وظيف|توظيف|فرصه عمل|فرصه شغل/,
  cv: /سيره ذاتيه|السيره الذاتيه|(?:^|[^a-z])cv(?:[^a-z]|$)/,
  work: /(?:العمل|اعمل|اشتغل|الشغل|التدريس|ادرس)\s+(?:معكم|معاكم|لديكم|عندكم|بالاكاديميه|في الاكاديميه)/,
  join: /(?:الانضمام|انضم)\s+(?:الي|ل)\s*(?:فريق|كادر|طاقم|معلمات|محفظات)/,
};

/** How many of a contact's first inbound texts are read. */
const FIRST_TEXTS = 3;

/** Names of the patterns that match (empty = no hint). */
export function jobSeekerHints(texts: readonly string[]): string[] {
  const t = normalizeArabic(texts.slice(0, FIRST_TEXTS).join(' \n '));
  return Object.entries(PATTERNS)
    .filter(([, re]) => re.test(t))
    .map(([name]) => name);
}
