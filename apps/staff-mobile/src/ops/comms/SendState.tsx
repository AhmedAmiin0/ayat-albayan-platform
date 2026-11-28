import type { SendGateView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { apiFetch, t, pathKey, ErrorState, StatusChip } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { ReadOnlySettings } from '@/ops/settings/ReadOnlySettings';
import { useSettings } from '@/ops/settings/use-settings';
import { gateChip, gateLine } from './gate-words';

const GATE_PATH = '/messages/gate';

/**
 * The effective gate under the switches, folded: the chip and one line (reason, then queue) side
 * by side. Quiet while loading or when the read fails (the switches still show).
 */
function GateLine() {
  const gate = useQuery({
    queryKey: pathKey(GATE_PATH),
    queryFn: () => apiFetch<SendGateView>(GATE_PATH),
  });
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
 * messages and the CRM move from GET /settings (its note says what is managed on the web), then
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
