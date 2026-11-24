import { useQuery } from '@tanstack/react-query';
import { settingsQuery } from '@/lib/settings/settings-api';
import { integrationsQuery } from '@/features/platform/integrations/integrations-api';
import { linesCheckQuery } from '@/features/messaging/messaging/api';
import { catalogueQuery } from './catalogue-api';

/** One cache entry refetched on settings, integrations or line-check changes. */
export function useCatalogue() {
  const settings = useQuery(settingsQuery);
  const check = useQuery(linesCheckQuery);
  const integrations = useQuery(integrationsQuery);
  const version = settings.dataUpdatedAt + check.dataUpdatedAt + integrations.dataUpdatedAt;
  return useQuery({ ...catalogueQuery(version), enabled: settings.isSuccess });
}
