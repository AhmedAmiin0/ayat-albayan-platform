import type { NumberPurpose } from '@ab/catalog';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/** A plain label, never a chip (docs/12 §13.10); no hooks so rows render without a QueryClient. */
export function LineBadge({ line }: { line: NumberPurpose | null | undefined }) {
  if (!line) return null;
  return (
    <span className="text-2xs text-ink-3" data-testid="line-badge" data-line={line}>
      {t.enums.waLine[line]}
    </span>
  );
}
