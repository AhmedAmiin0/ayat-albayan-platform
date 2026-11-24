import { View } from 'react-native';
import { useSmallText } from '../../chat-ui/bubble/use-small-text';
import { t } from '../../lib/i18n/i18n';
import { type, useTheme } from '../../theme';
import { AppText } from '../../ui/primitives/AppText';

interface ReadsRow {
  key: string;
  line: string;
  /** When she read it; '' for those who have not. */
  time: string;
}

export function ReadsList({ title, rows }: { title: string; rows: readonly ReadsRow[] }) {
  const { color } = useTheme();
  const small = useSmallText('ink3');
  return (
    <View style={{ gap: 4 }}>
      <AppText accessibilityRole="header" style={{ ...small, fontFamily: type.ui[600] }}>
        {title}
      </AppText>
      {rows.length === 0 ? <AppText style={small}>{t.studentChannel.reads.none}</AppText> : null}
      {rows.map((row) => (
        <View key={row.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AppText style={{ flex: 1, fontSize: type.size.sm, color: color.ink }}>
            {row.line}
          </AppText>
          {row.time ? <AppText style={small}>{row.time}</AppText> : null}
        </View>
      ))}
    </View>
  );
}
