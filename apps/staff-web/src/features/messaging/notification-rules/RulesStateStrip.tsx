import { counted } from '@ab/core';
import type { AcademySettings } from '@ab/settings';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { StatusChip } from '@ab/web-kit/components/ui/display/status-chip';
import { sendGateQuery } from '@/features/messaging/messaging/api';
import { sendingChip } from '@/features/messaging/messaging/sending-chip';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const r = t.notificationRules;

/** Same queued count as GET /messages/gate. */
export const queuedWords = (n: number): string => (n === 0 ? r.strip.queued.zero : counted(r.strip.queued, n));

/** Every row's send state depends on the sending and automatic-messages switches (docs/26b §3). */
export function RulesStateStrip({ settings }: { settings: AcademySettings }) {
  const gate = useQuery(sendGateQuery);
  const sending = sendingChip(settings.messaging_enabled, gate.data);
  const auto = settings.auto_messages_enabled;
  return (
    <div role="group" aria-label={r.strip.label} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <StatusChip {...sending} size="sm" label={t.settingsPages.sendingState.replace('{state}', sending.label)} />
      <StatusChip tone={auto ? 'ok' : 'neutral'} glyph={auto ? 'fill' : 'struck'} size="sm" label={auto ? r.strip.autoOn : r.strip.autoOff} />
      {gate.data && <span className="text-xs text-ink-2">{queuedWords(gate.data.queued)}</span>}
      <Link
        to="/admin/settings/communications"
        search={{}}
        className="inline-flex min-h-11 items-center text-xs font-semibold text-lapis underline underline-offset-4 sm:min-h-0"
      >
        {t.communicationsHub.openOverview}
      </Link>
    </div>
  );
}
