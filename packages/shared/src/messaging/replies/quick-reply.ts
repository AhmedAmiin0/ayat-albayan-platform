import { normalizeArabic } from '../../format/arabic.js';

// Quick replies (R-MSG-04, R-SCH-03): a guardian answers a reminder with a button or a short text.
// Precision over recall: anything unclear is null, and the admin reads it in the inbox.

/** rate_* = the three lesson_rating buttons (migration 195, rating.ts); never read from typed text. */
export const QUICK_REPLY_INTENTS = ['confirm', 'reschedule', 'stop', 'rate_excellent', 'rate_good', 'rate_needs_work'] as const;
export type QuickReplyIntent = (typeof QUICK_REPLY_INTENTS)[number];

const SEP = ':';

/** The button payload the sender attaches: «confirm:<lesson id>», «stop:<lead id>». */
export function quickReplyPayload(intent: QuickReplyIntent, ref: string): string {
  return `${intent}${SEP}${ref}`;
}

function payloadIntent(input: string): QuickReplyIntent | null {
  const head = input.split(SEP, 1)[0] ?? '';
  return (QUICK_REPLY_INTENTS as readonly string[]).includes(head) ? (head as QuickReplyIntent) : null;
}

/** The lesson / lead id inside one of our payloads; null for anything else. */
export function payloadRef(payload: string): string | null {
  const at = payload.indexOf(SEP);
  if (at < 0 || !payloadIntent(payload)) return null;
  return payload.slice(at + 1).trim() || null;
}

// Written already normalised (normalizeArabic: أإآ→ا, ة→ه, ى→ي, Latin lowercased).
const STOP = ['وقف', 'ايقاف', 'وقف الرسايل', 'وقف الرسائل', 'الغاء الاشتراك', 'stop', 'unsubscribe'];
const RESCHEDULE = [
  'تاجيل', 'اجل', 'اجلها', 'ناجل', 'ناجلها', 'غير الميعاد', 'نغير الميعاد', 'تغيير الميعاد',
  'غيروا الميعاد', 'ميعاد تاني', 'ميعاد اخر', 'مش هنقدر', 'مش هقدر', 'مش هنلحق',
];
const CONFIRM = new Set([
  'نعم', 'اه', 'ايوه', 'ايوا', 'تمام', 'موافق', 'موافقه', 'اكيد', 'حاضر', 'موكد',
  'ok', 'okay', 'yes',
]);
/** «تم» is «done» far more often than «yes» («تم التحويل»): a confirm only on its own. */
const CONFIRM_ALONE = 'تم';
/**
 * Any of these turns a «yes» into something the admin should read: a negation or «but», or talk
 * of money and renewals («تمام هبعت الفلوس بكرة», «تم التحويل»), which is not about the lesson.
 */
const BLOCKERS = new Set([
  'مش', 'لا', 'لاء', 'مو', 'ما', 'بس', 'no', 'not',
  'تحويل', 'التحويل', 'حولت', 'حولنا', 'هحول', 'فلوس', 'الفلوس', 'المبلغ', 'مبلغ', 'دفعت', 'هدفع',
  'الدفع', 'هبعت', 'ايصال', 'الايصال', 'اشتراك', 'الاشتراك', 'الباقه', 'باقه', 'تجديد', 'هجدد',
]);
const GOD_WILLING = ['ان شاء الله', 'انشاء الله', 'انشالله'];
const MAX_CONFIRM_WORDS = 6;
const THUMBS_UP = /^(?:👍[\u{1F3FB}-\u{1F3FF}]?\s*)+$/u;

function words(text: string): string[] {
  return normalizeArabic(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

/** True when `phrase`'s words appear consecutively in `tokens`. */
function hasPhrase(tokens: readonly string[], phrase: string): boolean {
  const p = phrase.split(' ');
  return tokens.some((_, i) => p.every((w, j) => tokens[i + j] === w));
}

function confirms(tokens: readonly string[]): boolean {
  if (tokens.length === 1 && tokens[0] === CONFIRM_ALONE) return true;
  if (tokens.length === 0 || tokens.length > MAX_CONFIRM_WORDS) return false;
  if (tokens.some((t) => BLOCKERS.has(t))) return false;
  return tokens.some((t) => CONFIRM.has(t)) || GOD_WILLING.includes(tokens.join(' '));
}

/**
 * confirm / reschedule / stop from a button payload («confirm:<id>») or a short text in Egyptian
 * or Gulf Arabic (نعم، أيوه، تمام، موافق، أكيد · تأجيل، غيّر الميعاد · وقف، إلغاء الاشتراك، stop).
 * Stop beats reschedule beats confirm; a «yes» with مش / لا / بس or money talk in it, «تم» with
 * anything after it, or a long text, is null.
 */
export function quickReplyIntent(input: string): QuickReplyIntent | null {
  const payload = payloadIntent(input.trim());
  if (payload) return payload;
  if (THUMBS_UP.test(input.trim())) return 'confirm';
  const tokens = words(input);
  if (STOP.some((p) => hasPhrase(tokens, p))) return 'stop';
  if (RESCHEDULE.some((p) => hasPhrase(tokens, p))) return 'reschedule';
  return confirms(tokens) ? 'confirm' : null;
}
