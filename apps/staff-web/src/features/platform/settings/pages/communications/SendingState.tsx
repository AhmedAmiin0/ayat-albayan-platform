import type { AcademySettings } from '@ab/settings';
import { useQuery } from '@tanstack/react-query';
import { StatusChip } from '@ab/web-kit/components/ui/display/status-chip';
import { sendGateQuery } from '@/features/messaging/messaging/api';
import { sendingChip } from '@/features/messaging/messaging/sending-chip';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/** Named so it never reads as the kill switch's own chip (docs/26b §3). */
export function SendingState({ settings }: { settings: AcademySettings }) {
  const gate = useQuery(sendGateQuery);
  const chip = sendingChip(settings.messaging_enabled, gate.data);
  return (
    <div role="group" aria-label={t.settingsPages.sendingNow} className="flex min-w-0 items-center">
      <StatusChip {...chip} label={t.settingsPages.sendingState.replace('{state}', chip.label)} />
    </div>
  );
}
