import type { SendGateView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { apiFetch } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { shape } from '@/theme';
import { pathKey } from '@/core/lib/query/query-keys';
import { AppText } from '@/core/ui/primitives/AppText';
import { useNoteStyle } from '../../shared/note-style';

const PATH = '/messages/gate';

/**
 * While a send gate is closed, messages wait in the queue (docs/12 §3.1): the admin's switch
 * («الإرسال متوقف») or the server — env off / WhatsApp not configured — which the switch alone
 * can't open. Nothing when sending is on. One line (the chat needs the room); a tap shows it whole,
 * and a screen reader always reads it whole.
 */
export function GateNote() {
  const note = useNoteStyle();
  const [whole, setWhole] = useState(false);
  const gate = useQuery({ queryKey: pathKey(PATH), queryFn: () => apiFetch<SendGateView>(PATH) });
  if (gate.data?.open !== false) return null;
  const text =
    gate.data.reason === 'switch_off' ? t.inbox.messagingOff : t.inbox.messagingOffServer;
  return (
    <Pressable
      testID="gate-note"
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityState={{ expanded: whole }}
      onPress={() => setWhole((w) => !w)}
      style={{ minHeight: shape.control.touch, justifyContent: 'center' }}
    >
      <AppText numberOfLines={whole ? undefined : 1} style={note}>
        {text}
      </AppText>
    </Pressable>
  );
}
