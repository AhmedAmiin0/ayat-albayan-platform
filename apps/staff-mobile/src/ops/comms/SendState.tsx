import { View } from 'react-native';
import { t, ErrorState, StatusChip } from '@ab/mobile-kit';
import { useSendGate } from '@/inbox';
import { Note } from '@/core/ui/feedback/Note';
import { ReadOnlySettings } from '@/ops/settings/ReadOnlySettings';
import { useSettings } from '@/ops/settings/use-settings';
import { gateChip, gateLine } from './gate-words';

/**
 * The effective gate under the switches, folded: the chip and one line (reason, then the queue) side
 * by side. Quiet while loading or when the read fails (the switches still show).
 */
function GateLine() {
  const gate = useSendGate();
  if (!gate.data) return null;
  return (
    <View testID="gate-state" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <StatusChip {...gateChip(gate.data)} size="sm" />
      <View style={{ flex: 1, minWidth: 160 }}>
        <Note>{gateLine(gate.data)}</Note>
      </View>
    </View>
  );
}

/**
 * The send state on the overview, read-only (it sends real WhatsApp messages): messaging, automatic
 * messages and the CRM move from GET /settings (its note also says what is managed on the web), then
 * the server's gate and queue from GET /messages/gate.
 */
export function SendState() {
  const query = useSettings();
  if (query.data) {
    return (
      <View style={{ gap: 6 }}>
        <ReadOnlySettings settings={query.data} note={t.communicationsHub.webOnly} />
        <GateLine />
      </View>
    );
  }
  return query.isError ? (
    <ErrorState onRetry={() => void query.refetch()} />
  ) : (
    <Note>{t.common.loading}</Note>
  );
}
