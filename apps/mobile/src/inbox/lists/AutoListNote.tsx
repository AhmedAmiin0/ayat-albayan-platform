import type { ChatListAutoRule } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';

/** The quiet «تُحدَّث تلقائيًا» chip of an automatic list (docs/22 «القوائم التلقائية»); not a control. */
export function AutoListChip() {
  const { color } = useTheme();
  return (
    <View
      testID="auto-list-chip"
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: shape.radius.pill,
        borderWidth: 1,
        borderColor: color.ruleStrong,
        backgroundColor: color.neutralSoft,
      }}
    >
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size['2xs'], lineHeight: 18, color: color.ink2 }}>{t.inbox.lists.auto}</AppText>
    </View>
  );
}

/** The chip, then one line saying who is added: «يُضاف إليها تلقائيًا كل …». Read as one sentence. */
export function AutoListNote({ rule }: { rule: ChatListAutoRule }) {
  const { color } = useTheme();
  const line = t.inbox.lists.autoRule[rule];
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={`${t.inbox.lists.auto}. ${line}`} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
      <AutoListChip />
      <AppText style={{ flexShrink: 1, fontFamily: type.ui[400], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs), color: color.ink3 }}>
        {line}
      </AppText>
    </View>
  );
}
