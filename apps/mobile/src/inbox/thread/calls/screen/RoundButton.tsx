import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

type RoundTone = 'plain' | 'accept' | 'end';

interface RoundButtonProps {
  label: string;
  tone: RoundTone;
  onPress: () => void;
  /** A toggle (كتم, مكبر الصوت): its state is read out and the circle fills. */
  pressed?: boolean;
  icon: (ink: string) => ReactNode;
}

/** A call control (WhatsApp's round buttons): a 64pt circle and its word under it. */
export function RoundButton({ label, tone, onPress, pressed, icon }: RoundButtonProps) {
  const { color } = useTheme();
  // A visible edge on the cover (≥ 3:1 non-text contrast): the neutral control is outlined in coverInk
  // and fills with it while on; «إنهاء» / «رفض» and «قبول» are their solid action fills.
  const fill = tone === 'end' ? color.badSolid : tone === 'accept' ? color.lapisFill : pressed ? color.coverInk : 'transparent';
  const ink = tone === 'end' ? color.onBad : tone === 'accept' ? color.onLapis : pressed ? color.cover : color.coverInk;
  const edge = tone === 'plain' ? { borderWidth: 1.5, borderColor: color.coverInk } : {};
  return (
    <View style={{ alignItems: 'center', gap: 8, minWidth: 72 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={pressed === undefined ? undefined : { selected: pressed }}
        onPress={onPress}
        style={({ pressed: down }) => ({ width: 64, height: 64, borderRadius: 32, backgroundColor: fill, ...edge, alignItems: 'center', justifyContent: 'center', opacity: down ? 0.85 : 1 })}
      >
        {icon(ink)}
      </Pressable>
      <AppText importantForAccessibility="no" style={{ fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs), color: color.coverInk }}>
        {label}
      </AppText>
    </View>
  );
}
