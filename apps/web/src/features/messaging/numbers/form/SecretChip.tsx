import type { NumberSecretState } from '@ab/shared';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';
import { formatDateTime } from '../../../sales/leads/format';
import { useClock } from '@/lib/clock';

/** A number's secret as «محفوظ» (with when) or «غير محفوظ»: never its value. */
export function SecretChip({ state }: { state: NumberSecretState }) {
  const clock = useClock();
  if (!state.set) return <StatusChip tone="neutral" glyph="hollow" size="sm" label={t.numbers.secret.notSet} />;
  const when = state.updated_at ? ` · ${formatDateTime(state.updated_at, clock)}` : '';
  return <StatusChip tone="ok" glyph="fill" size="sm" label={`${t.numbers.secret.set}${when}`} />;
}
