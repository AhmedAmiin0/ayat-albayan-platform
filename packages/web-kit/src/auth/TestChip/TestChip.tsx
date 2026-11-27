import { StatusChip } from '@ab/web-kit/components/ui/display/status-chip';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { TestChipProps } from './TestChip.types';

/** Marks a test account or student (docs/56) so nobody mistakes it for real. */
export function TestChip({ when = true, className }: TestChipProps) {
  if (!when) return null;
  return (
    <StatusChip
      tone="act"
      glyph="hollow"
      size="sm"
      label={t.testAccounts.chip}
      className={className}
    />
  );
}
