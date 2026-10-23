import { useQuery } from '@tanstack/react-query';
import { Section } from '@/components/settings/Section';
import { t } from '@/lib/i18n';
import { GoogleSection } from '../google-sync/GoogleSection';
import { integrationsQuery } from './integrations-api';
import { integrationsMatch } from './integrations-form';
import { INTEGRATIONS_SECTION } from './integrations-section';
import { IntegrationsForm } from './IntegrationsForm';

const s = t.integrations;

/**
 * «التكاملات» (owner, 2026-10-12: config in the database): the WhatsApp lines, the test-safety
 * guards, LiveKit, Expo and the exchange-rate URL. A value saved here wins over the server's env;
 * clearing it brings the server's value back. Secrets are write-only (Vault). Below the form, the
 * Google sync section (docs/24 §3): connection, switches, mappings and the sync log.
 */
export function IntegrationsPanel({ query, onSaved }: { query: string; onSaved: (message: string) => void }) {
  const list = useQuery(integrationsQuery);
  if (!integrationsMatch(query)) return null;
  return (
    <Section id={INTEGRATIONS_SECTION.id} title={INTEGRATIONS_SECTION.label}>
      <p className="text-xs text-ink-3">{s.intro}</p>
      <p className="text-xs text-ink-3">{s.secretNote}</p>
      {list.isError && <p className="text-sm text-ink-2">{s.loadError}</p>}
      {list.data && <IntegrationsForm items={list.data} query={query} onNote={onSaved} />}
      <GoogleSection onNote={onSaved} />
    </Section>
  );
}
