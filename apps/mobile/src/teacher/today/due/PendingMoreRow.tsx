import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';
import { PENDING_REPORTS_HREF } from './due-reports';

const moreStyle = { fontFamily: type.ui[600], fontSize: type.size.sm, lineHeight: 22 } as const;

/** «عرض الباقي (N)»: the last row of the due block, to the whole pending list (docs/48). */
export function PendingMoreRow({ count }: { count: number }) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(PENDING_REPORTS_HREF)}
      style={({ pressed }) => ({
        minHeight: 48,
        justifyContent: 'center',
        paddingHorizontal: 16,
        backgroundColor: pressed ? color.sunk : 'transparent',
      })}
    >
      <AppText style={{ ...moreStyle, color: color.lapis, fontVariant: ['tabular-nums'] }}>
        {t.teacherToday.pendingMore.replace('{n}', String(count))}
      </AppText>
    </Pressable>
  );
}
