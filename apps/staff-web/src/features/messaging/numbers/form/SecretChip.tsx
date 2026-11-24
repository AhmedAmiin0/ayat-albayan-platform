import type { NumberSecretState } from '@ab/shared';
import { StatusChip } from '@ab/web-kit/components/ui/display/status-chip';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { formatDateTime } from '@/features/sales/leads/format';
import { useClock } from '@ab/web-kit/lib/clock';

/** A secret's value is never shown. */
export function SecretChip({ state }: { state: NumberSecretState }) {
  const clock = useClock();
  if (!state.set) return <StatusChip tone="neutral" glyph="hollow" size="sm" label={t.numbers.secret.notSet} />;
  const when = state.updated_at ? ` · ${formatDateTime(state.updated_at, clock)}` : '';
  return <StatusChip tone="ok" glyph="fill" size="sm" label={`${t.numbers.secret.set}${when}`} />;
}
