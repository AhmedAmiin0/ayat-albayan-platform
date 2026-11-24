import type { SendGateView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { apiFetch, t, shape, pathKey, AppText } from '@ab/mobile-kit';
import { useNoteStyle } from '@/inbox/shared/note-style';

const PATH = '/messages/gate';

/** docs/12 §3.1: the switch alone cannot open a server-side gate; readers always get it whole. */
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
