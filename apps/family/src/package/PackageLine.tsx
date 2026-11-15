import { packageSummary } from '@ab/client-core';
import type { PortalPackageView } from '@ab/shared';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { AppText, Chevron, t, type, useTheme } from '@ab/mobile-kit';
import { packageHref } from '@/nav';
import { dayDate, leftText } from './package-text';

interface PackageLineProps {
  view: PortalPackageView;
  studentId: string;
}

/** The home card's package line (canvas Home): what is left and the renewal → «الباقة». */
export function PackageLine({ view, studentId }: PackageLineProps) {
  const { color } = useTheme();
  if (!view.package) return null;
  const summary = packageSummary(view.package);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={t.portal.app.package.open}
      onPress={() => router.push(packageHref(studentId))}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: color.rule,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flex: 1 }}>
        <AppText style={{ fontSize: type.size.sm, color: color.ink2 }}>{leftText(summary)}</AppText>
        {summary.renewsOn ? (
          <AppText style={{ fontSize: type.size.xs, color: color.ink3 }}>
            {t.portal.app.package.renews.replace('{date}', dayDate(summary.renewsOn))}
          </AppText>
        ) : null}
      </View>
      <Chevron to="next" color={color.ink3} />
    </Pressable>
  );
}
