import { reactorLines } from '@ab/client-core';
import type { MessageView } from '@ab/shared';
import { Modal, Pressable, View } from 'react-native';
import { t, shape, type, useTheme, AppText, Button } from '@ab/mobile-kit';

interface ReactorsSheetProps {
  /** The message whose pill was tapped; null hides the sheet. */
  message: MessageView | null;
  /** The chat's name (the contact). */
  contact: string | null;
  /** Absent means ours cannot be changed here (closed window or read-only chat). */
  onRemove?: (m: MessageView) => void;
  onClose: () => void;
}

export function ReactorsSheet({ message: m, contact, onRemove, onClose }: ReactorsSheetProps) {
  const { color } = useTheme();
  const lines = m ? reactorLines(m.reactions, contact) : [];
  const name = (l: (typeof lines)[number]) =>
    l.name ?? (l.mine ? t.inbox.reactions.academy : t.inbox.reactions.contact);
  return (
    <Modal visible={m !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel={t.common.cancel} onPress={onClose} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: color.scrim }}>
        <View
          testID="reactors-sheet"
          accessibilityLabel={t.inbox.reactions.sheet}
          onStartShouldSetResponder={() => true}
          style={{
            gap: 8,
            padding: 16,
            paddingBottom: 32,
            borderTopStartRadius: shape.radius.lg,
            borderTopEndRadius: shape.radius.lg,
            backgroundColor: color.raised,
          }}
        >
          <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.body }}>
            {t.inbox.reactions.sheet}
          </AppText>
          {lines.map((l) => (
            <View key={l.mine ? 'ours' : 'theirs'} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: shape.control.touch }}>
              <AppText style={{ fontSize: 24 }}>{l.emoji}</AppText>
              <AppText style={{ flex: 1, fontFamily: type.ui[400], fontSize: type.size.body, writingDirection: 'auto' }}>{name(l)}</AppText>
              {l.mine && m && onRemove ? (
                <Button
                  variant="danger"
                  label={t.inbox.reactions.remove}
                  accessibilityLabel={t.inbox.reactions.removeLabel.replace('{emoji}', l.emoji)}
                  onPress={() => {
                    onRemove(m);
                    onClose();
                  }}
                />
              ) : null}
            </View>
          ))}
          <Button variant="secondary" label={t.common.close} onPress={onClose} />
        </View>
      </Pressable>
    </Modal>
  );
}
