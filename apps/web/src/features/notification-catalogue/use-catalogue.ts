import { useQuery } from '@tanstack/react-query';
import { settingsQuery } from '@/lib/settings/settings-api';
import { integrationsQuery } from '../integrations/integrations-api';
import { linesCheckQuery } from '../messaging/api';
import { catalogueQuery } from './catalogue-api';

/**
 * GET /admin/notifications as «الإشعارات» and «نظرة عامة» read it (one cache entry): refetched whenever
 * the settings, «التكاملات» or a line check change; the first fetch once the settings are in.
 */
export function useCatalogue() {
  const settings = useQuery(settingsQuery);
  const check = useQuery(linesCheckQuery);
  const integrations = useQuery(integrationsQuery);
  const version = settings.dataUpdatedAt + check.dataUpdatedAt + integrations.dataUpdatedAt;
  return useQuery({ ...catalogueQuery(version), enabled: settings.isSuccess });
}
