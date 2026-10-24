import type { TemplateNumberSyncView } from '@ab/shared';
import { t } from '@/lib/i18n';

// «ترتيب البديل» and the per-number template sync (docs/23c decision 9). Pure.

export const RANK_MIN = 0;
export const RANK_MAX = 999;

/** The typed rank as the API accepts it (an integer 0–999), else null. */
export function parseRank(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d{1,3}$/.test(trimmed)) return null;
  const rank = Number(trimmed);
  return rank >= RANK_MIN && rank <= RANK_MAX ? rank : null;
}

const ERRORS: Record<string, string | undefined> = t.numbers.templateSync.errors;

/** One number's template sync in words: the counts, or why it failed (unknown codes as «حدث خطأ»). */
export function syncResultText(
  sync: Pick<TemplateNumberSyncView, 'ok' | 'error' | 'message' | 'meta_count' | 'synced'>,
): string {
  const s = t.numbers.templateSync;
  if (sync.ok)
    return s.done
      .replace('{{meta}}', String(sync.meta_count))
      .replace('{{synced}}', String(sync.synced));
  const reason = (sync.error ? ERRORS[sync.error] : undefined) ?? t.numbers.errors.generic;
  return s.failed.replace('{{error}}', reason.replace('{{message}}', sync.message ?? '—'));
}
