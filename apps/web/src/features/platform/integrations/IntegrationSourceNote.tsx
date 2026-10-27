import type { IntegrationConfigItem } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { formatDateTime } from '../../sales/leads/format';
import { useClock } from '@/lib/clock';

/** Under a plain field's hint: where the value in use comes from (settings, the server, nowhere). */
export function IntegrationSourceNote({ item }: { item: IntegrationConfigItem }) {
  const clock = useClock();
  const words = t.integrations.source[item.source];
  const at = item.source === 'db' && item.updated_at ? ` · ${formatDateTime(item.updated_at, clock)}` : '';
  return (
    <p className="text-2xs text-ink-3" data-source={item.source}>
      {words}
      {at}
    </p>
  );
}
