import type { IntegrationConfigItem } from '@ab/catalog';
import { t, useClock } from '@ab/web-kit';
import { formatDateTime } from '@/features/sales/leads';

/** Under a plain field's hint: where the value in use comes from (settings, server, nowhere). */
export function IntegrationSourceNote({ item }: { item: IntegrationConfigItem }) {
  const clock = useClock();
  const words = t.integrations.source[item.source];
  const at =
    item.source === 'db' && item.updated_at ? ` · ${formatDateTime(item.updated_at, clock)}` : '';
  return (
    <p className="text-2xs text-ink-3" data-source={item.source}>
      {words}
      {at}
    </p>
  );
}
