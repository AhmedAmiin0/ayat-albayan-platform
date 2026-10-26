import type { IntegrationConfigItem } from '@ab/shared';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';
import { formatDateTime } from '../../../sales/leads/format';

/** A secret's state, never its value: saved in settings (and when), set on the server, or not set. */
export function SecretStatusChip({ item }: { item: IntegrationConfigItem }) {
  const s = t.integrations;
  if (item.source === 'db') {
    return <StatusChip tone="ok" glyph="fill" size="sm" label={s.secretSaved.replace('{at}', formatDateTime(item.updated_at))} />;
  }
  if (item.source === 'env') return <StatusChip tone="act" glyph="hollow" size="sm" label={s.secretFromServer} />;
  return <StatusChip tone="neutral" glyph="hollow" size="sm" label={s.secretUnset} />;
}
