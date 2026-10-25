import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { t } from '@/lib/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { SavedReplyIcon } from '../chat-icons';

export interface SavedRepliesButtonProps {
  /** The 24 h window: outside it the composer is templates only and the button only explains why. */
  open: boolean;
  onPress: () => void;
}

/**
 * «الردود السريعة» beside the box (owner 2026-10-25), 44pt. After the window it stays in its place,
 * dimmed and announced disabled with the reason as its hint; a tap shows that reason over the row
 * (absolutely placed, so the closed row keeps its height).
 */
export function SavedRepliesButton({ open, onPress }: SavedRepliesButtonProps) {
  const { color } = useTheme();
  const [hint, setHint] = useState(false);
  return (
    <View>
      {hint && !open ? (
        <AppText
          accessibilityLiveRegion="polite"
          style={{
            position: 'absolute', bottom: shape.control.touch + 4, end: 0, width: 240, padding: 8,
            borderRadius: shape.radius.md, borderWidth: 1, borderColor: color.rule, backgroundColor: color.raised,
            fontFamily: type.ui[500], fontSize: type.size['2xs'], lineHeight: type.lineHeight(type.size['2xs']), color: color.ink,
          }}
        >
          {t.savedReplies.closedHint}
        </AppText>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.savedReplies.open}
        accessibilityHint={open ? undefined : t.savedReplies.closedHint}
        accessibilityState={{ disabled: !open }}
        onPress={open ? onPress : () => setHint((v) => !v)}
        style={({ pressed }) => ({
          width: shape.control.touch, height: shape.control.touch, borderRadius: shape.radius.md,
          alignItems: 'center', justifyContent: 'center', opacity: open ? 1 : 0.45,
          backgroundColor: pressed && open ? color.lapisWash : 'transparent',
        })}
      >
        <SavedReplyIcon color={color.lapis} />
      </Pressable>
    </View>
  );
}
