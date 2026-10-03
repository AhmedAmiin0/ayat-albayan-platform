import { CONFLICT_KINDS, lessonWhenText, RIYADH_TZ, type Conflict } from '@ab/shared';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import { isOffline } from '@/payments/payment-errors';

// What a failed POST /booking means for the trial wizard (docs/10 §3: clients switch on `code`).

export interface Candidate {
  id: string;
  name: string;
  code: string | null;
}

export type BookFailure =
  /** 409 conflict: the slot clashes; one Arabic line per clash, then «اختار ميعاد تاني». */
  | { kind: 'conflict'; lines: string[] }
  /** 409 duplicate_student: the family has a similar-named child (R-STU-03). */
  | { kind: 'duplicate'; candidates: Candidate[] }
  /** The invoice is missing, unusable or gone from WhatsApp: back to «الفاتورة» for another. */
  | { kind: 'invoice'; text: string }
  | { kind: 'error'; text: string };

const messages: Record<string, string | undefined> = t.booking.error;
const isInvoiceCode = (code: string) => code.startsWith('invoice_') || code === 'media_expired';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isConflict(v: unknown): v is Conflict {
  return (
    isRecord(v) && CONFLICT_KINDS.some((k) => k === v['kind']) && typeof v['startsAt'] === 'string'
  );
}

function toCandidate(v: unknown): Candidate | null {
  if (!isRecord(v) || typeof v['id'] !== 'string' || typeof v['name'] !== 'string') return null;
  return { id: v['id'], name: v['name'], code: typeof v['code'] === 'string' ? v['code'] : null };
}

/** «المعلم/ة مشغول/ة بحلقة تانية في الميعاد ده (الأحد 4 أكتوبر 17:00)», Riyadh wall clock. */
export function conflictLine(c: Conflict): string {
  return t.booking.conflict[c.kind].replace(
    '{when}',
    lessonWhenText(new Date(c.startsAt), RIYADH_TZ, locale),
  );
}

/** The API's own refusal (invoice, makeup): its code has a line in booking.error. */
function codedFailure(code: unknown): BookFailure | null {
  const text = typeof code === 'string' ? messages[code] : undefined;
  if (typeof code !== 'string' || text === undefined) return null;
  return { kind: isInvoiceCode(code) ? 'invoice' : 'error', text };
}

/** The 409s that carry data: the clashes, or the similar-named children. */
function conflictFailure(body: Record<string, unknown>): BookFailure | null {
  const list = (key: string): unknown[] => {
    const v = body[key];
    return Array.isArray(v) ? v : [];
  };
  if (body['code'] === 'conflict') {
    return { kind: 'conflict', lines: list('conflicts').filter(isConflict).map(conflictLine) };
  }
  const candidates = list('candidates')
    .map(toCandidate)
    .filter((c): c is Candidate => c !== null);
  if (body['code'] === 'duplicate_student' && candidates.length > 0) {
    return { kind: 'duplicate', candidates };
  }
  return null;
}

export function bookFailure(error: unknown): BookFailure {
  if (isOffline(error)) return { kind: 'error', text: t.booking.mobile.offline };
  if (!(error instanceof ApiError) || !isRecord(error.body)) {
    return { kind: 'error', text: t.common.error };
  }
  const coded = codedFailure(error.body['code']);
  if (coded) return coded;
  const data = error.status === 409 ? conflictFailure(error.body) : null;
  return data ?? { kind: 'error', text: t.common.error };
}
