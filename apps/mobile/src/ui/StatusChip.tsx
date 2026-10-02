import type { Glyph, Tone } from '@ab/shared';
import { View } from 'react-native';
import { type Palette, shape, type, useTheme } from '@/theme';
import { NuqtaGlyph } from './NuqtaGlyph';
import { AppText } from './AppText';

/** Foreground + soft background per tone (docs/07 §6). There is no neutral ink: it is ink-2. */
export function toneColors(color: Palette, tone: Tone): { fg: string; bg: string } {
  switch (tone) {
    case 'ok':
      return { fg: color.ok, bg: color.okSoft };
    case 'act':
      return { fg: color.act, bg: color.actSoft };
    case 'bad':
      return { fg: color.bad, bg: color.badSoft };
    case 'neutral':
      return { fg: color.ink2, bg: color.neutralSoft };
  }
}

export interface StatusChipProps {
  tone: Tone;
  glyph: Glyph;
  /** The ar.json word, e.g. t.enums.leadStatus[status]. Always shown. */
  label: string;
  size?: 'md' | 'sm';
}

/**
 * Status = nuqta glyph + word + tone colour (never colour alone). Spread a shared style entry:
 * `<StatusChip {...leadStatusStyle[s]} label={t.enums.leadStatus[s]} />`. Saffron (`act`) only
 * comes from those maps, so it only ever means «دورك».
 */
export function StatusChip({ tone, glyph, label, size = 'md' }: StatusChipProps) {
  const { color } = useTheme();
  const { fg, bg } = toneColors(color, tone);
  const md = size === 'md';
  return (
    <View
      testID={`chip-${tone}`}
      style={{
        alignSelf: 'flex-start',
        flexShrink: 1, // in a capped slot the word ellipsizes inside the pill instead of overflowing it
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: md ? 26 : 22,
        paddingStart: md ? 9 : 7,
        paddingEnd: md ? 11 : 9,
        borderRadius: shape.radius.pill,
        borderWidth: 1,
        borderColor: `${fg}40`, // tone at 25 %
        backgroundColor: bg,
      }}
    >
      <NuqtaGlyph shape={glyph} color={fg} />
      <AppText
        numberOfLines={1}
        style={{ flexShrink: 1, fontFamily: type.ui[600], fontSize: type.size.xs, lineHeight: 20, color: fg }}
      >
        {label}
      </AppText>
    </View>
  );
}
