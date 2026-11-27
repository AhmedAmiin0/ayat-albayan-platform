import { useState } from 'react';
import { Pressable } from 'react-native';
import { t, shape, AppText } from '@ab/mobile-kit';
import { useNoteStyle } from '@/inbox/shared/note-style';
import { useSendGate } from '@/inbox/shared/use-send-gate';

/** docs/12 §3.1: the switch alone cannot open a server-side gate; readers always get it whole. */
export function GateNote() {
  const note = useNoteStyle();
  const [whole, setWhole] = useState(false);
  const gate = useSendGate();
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
