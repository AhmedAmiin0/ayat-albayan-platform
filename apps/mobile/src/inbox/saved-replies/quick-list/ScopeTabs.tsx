import type { SavedReplyScope } from '@ab/shared';
import { Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

const TABS = (): { value: SavedReplyScope; label: string }[] => [
  { value: 'shared', label: t.savedReplies.tabShared },
  { value: 'mine', label: t.savedReplies.tabMine },
];

/** «المشتركة / ردودي» as a compact segmented control (two equal halves, 36pt, 44pt hit area). */
export function ScopeTabs({ value, onChange }: { value: SavedReplyScope; onChange: (next: SavedReplyScope) => void }) {
  const { color } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={t.savedReplies.listLabel}
      style={{ flexDirection: 'row', padding: 2, borderRadius: shape.radius.md, backgroundColor: color.sunk }}
    >
      {TABS().map((tab) => {
        const on = tab.value === value;
        return (
          <Pressable
            key={tab.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(tab.value)}
            hitSlop={{ top: 4, bottom: 4 }}
            style={{
              flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: shape.radius.sm,
              backgroundColor: on ? color.raised : 'transparent',
              borderWidth: on ? 1 : 0, borderColor: color.rule,
            }}
          >
            <AppText style={{ fontFamily: type.ui[on ? 600 : 500], fontSize: type.size.sm, lineHeight: 22, color: on ? color.ink : color.ink2 }}>
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
