import { View } from 'react-native';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { NuqtaGlyph } from '@/core/ui/primitives/NuqtaGlyph';

interface AuthAlertProps {
  text: string;
  /** bad: a refusal (struck glyph); ok: done or sent (filled glyph). Shape says it, colour confirms. */
  tone?: 'bad' | 'ok';
}

/** The §10 inline alert of the sign-in screens (docs/07): soft fill, glyph, word; read out politely. */
export function AuthAlert({ text, tone = 'bad' }: AuthAlertProps) {
  const { color } = useTheme();
  const ink = tone === 'bad' ? color.bad : color.ok;
  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        borderRadius: shape.radius.md,
        borderWidth: 1,
        borderColor: `${ink}59`, // the tone at 35 %
        backgroundColor: tone === 'bad' ? color.badSoft : color.okSoft,
      }}
    >
      <NuqtaGlyph shape={tone === 'bad' ? 'struck' : 'fill'} color={ink} />
      <AppText
        style={{
          flex: 1,
          fontFamily: type.ui[500],
          fontSize: type.size.sm,
          lineHeight: type.lineHeight(type.size.sm),
          color: color.ink,
        }}
      >
        {text}
      </AppText>
    </View>
  );
}
