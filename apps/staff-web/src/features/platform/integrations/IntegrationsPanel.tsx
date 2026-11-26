import type { IntegrationGroup } from '@ab/catalog';
import { useQuery } from '@tanstack/react-query';
import { Section } from '@/components/settings/Section';
import { t } from '@ab/web-kit';
import { integrationsQuery } from './integrations-api';
import { integrationsMatch } from './integrations-form';
import { INTEGRATIONS_SECTION } from './integrations-section';
import { IntegrationsForm } from './IntegrationsForm';
import { groupsMatch } from './integration-places';

const s = t.integrations;

export interface IntegrationsPanelProps {
  query: string;
  onSaved: (message: string) => void;
  /** Only these groups are shown, drafted and saved by this panel (integration-places.ts); all when absent. */
  groups?: readonly IntegrationGroup[] | undefined;
  title?: string | undefined;
  /** The first line under it (default the integrations intro). */
  intro?: string | undefined;
}

/** A saved value wins over the server's env and clearing restores it; secrets are write-only. */
export function IntegrationsPanel({
  query,
  onSaved,
  groups,
  title,
  intro,
}: IntegrationsPanelProps) {
  const list = useQuery(integrationsQuery);
  if (!(groups ? groupsMatch(groups)(query) : integrationsMatch(query))) return null;
  const items = groups ? list.data?.filter((i) => groups.includes(i.group)) : list.data;
  const id = groups ? `integrations-${groups.join('-')}` : INTEGRATIONS_SECTION.id;
  return (
    <Section id={id} title={title ?? INTEGRATIONS_SECTION.label}>
      <p className="text-xs text-ink-3">{intro ?? s.intro}</p>
      <p className="text-xs text-ink-3">{s.secretNote}</p>
      {list.isError && <p className="text-sm text-ink-2">{s.loadError}</p>}
      {items && <IntegrationsForm items={items} query={query} onNote={onSaved} />}
    </Section>
  );
}
