import type { UserReference } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { tableLabel } from './errors';

/** The tables that keep a user from being deleted, with how many rows each holds. */
export function HistoryReferences({ references }: { references: readonly UserReference[] }) {
  const { color } = useTheme();
  const text = { fontFamily: type.ui[400], fontSize: type.size.sm, color: color.ink };
  return (
    <View style={{ gap: 6 }}>
      <AppText style={text}>{t.users.delete.blocked}</AppText>
      {references.map((r) => (
        <View
          key={`${r.table}.${r.column}`}
          style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: color.rule }}
        >
          <AppText style={text}>{tableLabel(r.table)}</AppText>
          <AppText style={[text, { color: color.ink3, fontVariant: ['tabular-nums'] }]}>{String(r.count)}</AppText>
        </View>
      ))}
    </View>
  );
}
