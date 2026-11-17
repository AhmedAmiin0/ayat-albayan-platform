import { Pressable, View } from 'react-native';
import { AppText, type, useTheme } from '@ab/mobile-kit';

interface ActionRowProps {
  title: string;
  /** What the action does, under the title (the board's second line). */
  hint: string;
  onPress: () => void;
  /** «إلغاء الاشتراك»: the title in the danger ink. */
  danger?: boolean;
}

/**
 * One row of «إجراءات الدورة» (owner 2026-11-17): the action and what it does, 56pt at least,
 * a hairline under it like a list row; the screen reader hears the action, then the hint.
 */
export function ActionRow({ title, hint, onPress, danger = false }: ActionRowProps) {
  const { color } = useTheme();
  const size = type.size.xs;
  const small = { fontFamily: type.ui[400], fontSize: size, lineHeight: type.lineHeight(size) };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={hint}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 56,
        paddingHorizontal: 16,
        paddingVertical: 10,
        justifyContent: 'center',
        borderBottomWidth: 1,
        borderBottomColor: color.rule,
        backgroundColor: pressed ? color.sunk : color.raised,
      })}
    >
      <View style={{ gap: 2 }}>
        <AppText
          style={{
            fontFamily: type.ui[600],
            fontSize: type.size.base,
            lineHeight: type.lineHeight(type.size.base),
            color: danger ? color.bad : color.ink,
          }}
        >
          {title}
        </AppText>
        <AppText style={{ ...small, color: color.ink2 }}>{hint}</AppText>
      </View>
    </Pressable>
  );
}
