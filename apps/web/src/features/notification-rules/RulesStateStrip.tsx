import type { AcademySettings } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { StatusChip } from '@/components/ui/status-chip';
import { sendGateQuery } from '@/features/messaging/api';
import { sendingChip } from '@/features/messaging/sending-chip';
import { t } from '@/lib/i18n';

const r = t.notificationRules;

/**
 * The state strip of «الإشعارات» (docs/26b §3): sending, automatic messages, and the way to the
 * «الإرسال» tab that changes them. Every row's «هل يُرسل الآن؟» depends on these two.
 */
export function RulesStateStrip({ settings }: { settings: AcademySettings }) {
  const gate = useQuery(sendGateQuery);
  const sending = sendingChip(settings.messaging_enabled, gate.data);
  const auto = settings.auto_messages_enabled;
  return (
    <div role="group" aria-label={r.strip.label} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <StatusChip {...sending} size="sm" label={t.settingsPages.sendingState.replace('{state}', sending.label)} />
      <StatusChip tone={auto ? 'ok' : 'neutral'} glyph={auto ? 'fill' : 'struck'} size="sm" label={auto ? r.strip.autoOn : r.strip.autoOff} />
      <Link
        to="/admin/settings/communications"
        search={{}}
        className="inline-flex min-h-11 items-center text-xs font-semibold text-lapis underline underline-offset-4 sm:min-h-0"
      >
        {r.strip.openSending}
      </Link>
    </div>
  );
}
