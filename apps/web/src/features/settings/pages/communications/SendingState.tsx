import type { AcademySettings } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { StatusChip } from '@/components/ui/display/status-chip';
import { sendGateQuery } from '@/features/messaging/api';
import { sendingChip } from '@/features/messaging/sending-chip';
import { t } from '@/lib/i18n/i18n';

/**
 * The sending state in the head of «التواصل» (docs/26b §3 state strip), seen from every tab: the
 * same chip as the kill switch, named «إرسال الرسائل: …» so it never reads as the switch's own chip.
 */
export function SendingState({ settings }: { settings: AcademySettings }) {
  const gate = useQuery(sendGateQuery);
  const chip = sendingChip(settings.messaging_enabled, gate.data);
  return (
    <div role="group" aria-label={t.settingsPages.sendingNow} className="flex min-w-0 items-center">
      <StatusChip {...chip} label={t.settingsPages.sendingState.replace('{state}', chip.label)} />
    </div>
  );
}
