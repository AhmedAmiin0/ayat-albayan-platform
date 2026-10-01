import { View } from 'react-native';
import { type, useTheme } from '@/theme';
import { NuqtaGlyph } from '@/ui/NuqtaGlyph';
import { toneColors } from '@/ui/StatusChip';
import { AppText } from '@/ui/AppText';

/** «دورك» note (docs/07 §6 hamish): small saffron nuqta + ink 600 words, like the web row. */
export function StudentNote({ text }: { text: string }) {
  const { color } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <NuqtaGlyph shape="fill" color={toneColors(color, 'act').fg} size={9} />
      <AppText
        numberOfLines={1}
        style={{
          fontFamily: type.ui[600],
          fontSize: type.size['2xs'],
          lineHeight: type.lineHeight(type.size['2xs']),
          color: color.ink,
        }}
      >
        {text}
      </AppText>
    </View>
  );
}
