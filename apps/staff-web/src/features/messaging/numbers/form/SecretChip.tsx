import type { NumberSecretState } from '@ab/shared';
import { StatusChip, t, useClock } from '@ab/web-kit';
import { formatDateTime } from '@/features/sales/leads/format';

/** A secret's value is never shown. */
export function SecretChip({ state }: { state: NumberSecretState }) {
  const clock = useClock();
  if (!state.set) return <StatusChip tone="neutral" glyph="hollow" size="sm" label={t.numbers.secret.notSet} />;
  const when = state.updated_at ? ` · ${formatDateTime(state.updated_at, clock)}` : '';
  return <StatusChip tone="ok" glyph="fill" size="sm" label={`${t.numbers.secret.set}${when}`} />;
}
