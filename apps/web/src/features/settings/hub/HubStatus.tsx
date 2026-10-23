import { useQuery } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { StatusChip } from '@/components/ui/status-chip';
import { googleStatusQuery } from '@/features/google-sync/google-api';
import { fill } from '@/features/google-sync/google-format';
import { integrationsQuery } from '@/features/integrations/integrations-api';
import { sendGateQuery } from '@/features/messaging/api';
import { sendingChip } from '@/features/messaging/sending-chip';
import { t } from '@/lib/i18n';
import { settingsQuery } from '@/lib/settings-api';
import { readThemePref } from '@/lib/theme';
import { googleChips, integrationChips, valuesSummary, type HubChip } from './hub-status';
import type { HubDestination } from './hub-paths';

// «الحالة الآن» of each hub row, from the queries the pages already use. Loading, an error or a
// forbidden read shows a dash (named for screen readers), never a guess and never a crash.

const H = t.settingsHub;
const SUM = 'text-sm text-ink-2';

function Dash() {
  return (
    <span className={SUM}>
      <span aria-hidden="true">—</span>
      <span className="sr-only">{H.unknown}</span>
    </span>
  );
}

function Chips({ chips }: { chips: readonly HubChip[] }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
      {chips.map((c) => (
        <StatusChip key={c.label} size="sm" tone={c.tone} glyph={c.glyph} label={c.label} />
      ))}
    </span>
  );
}

function ValuesState() {
  const settings = useQuery(settingsQuery);
  if (!settings.isSuccess) return <Dash />;
  return <span className={`${SUM} tabular-nums`}>{valuesSummary(settings.data)}</span>;
}

function CommsState() {
  const settings = useQuery(settingsQuery);
  const gate = useQuery(sendGateQuery);
  if (!settings.isSuccess) return <Dash />;
  const enabled = settings.data.messaging_enabled;
  return (
    <span className="grid gap-1">
      <Chips chips={[sendingChip(enabled, gate.isSuccess ? gate.data : undefined)]} />
      {!enabled && <span className="text-xs text-ink-2">{H.sendingOffWhy}</span>}
    </span>
  );
}

function IntegrationsState() {
  const items = useQuery(integrationsQuery);
  if (!items.isSuccess) return <Dash />;
  return <Chips chips={integrationChips(items.data)} />;
}

function GoogleState() {
  const status = useQuery(googleStatusQuery);
  if (!status.isSuccess) return <Dash />;
  return <Chips chips={googleChips(status.data)} />;
}

function AppearanceState() {
  return <span className={SUM}>{fill(H.themeNow, { theme: t.theme[readThemePref()] })}</span>;
}

const STATE = {
  values: ValuesState,
  communications: CommsState,
  integrations: IntegrationsState,
  google: GoogleState,
  appearance: AppearanceState,
} satisfies Record<HubDestination, () => ReactElement>;

/** The live state cell of one destination. */
export function HubStatus({ destination }: { destination: HubDestination }) {
  const State = STATE[destination];
  return <State />;
}
