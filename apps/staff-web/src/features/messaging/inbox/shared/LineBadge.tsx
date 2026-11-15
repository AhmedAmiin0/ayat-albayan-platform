import type { NumberPurpose } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';

/**
 * Which WhatsApp line a thread or message came through (docs/12 §13.10, R-MSG-05): a plain label,
 * never a chip, a glyph or a tone; «خط المكالمات» for a message to the calls number (docs/28 §10).
 * Nothing for history and single-line deployments (null line).
 * No hooks or context: rows and bubbles render without a QueryClientProvider.
 */
export function LineBadge({ line }: { line: NumberPurpose | null | undefined }) {
  if (!line) return null;
  return (
    <span className="text-2xs text-ink-3" data-testid="line-badge" data-line={line}>
      {t.enums.waLine[line]}
    </span>
  );
}
