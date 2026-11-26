import { View } from 'react-native';
import { AppText, type, useTheme } from '@ab/mobile-kit';
import type { RowNote, RowTextProps } from './RowText.types';

/** A row's words at the inline-start: its title, one line, then short notes. */
export function RowText({ title, line, notes = [] }: RowTextProps) {
  const { color } = useTheme();
  const tone: Record<RowNote['tone'], string> = { quiet: color.ink3, link: color.lapis };
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <AppText style={{ fontFamily: type.ui[600], color: color.ink }}>{title}</AppText>
      {line ? (
        <AppText style={{ fontSize: type.size.xs, color: color.ink2 }}>{line}</AppText>
      ) : null}
      {notes.map((n) => (
        <AppText key={n.text} style={{ fontSize: type.size['2xs'], color: tone[n.tone] }}>
          {n.text}
        </AppText>
      ))}
    </View>
  );
}
