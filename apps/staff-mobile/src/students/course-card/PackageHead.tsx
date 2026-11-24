import { subscriptionStatusStyle, type CourseCardPackage } from '@ab/shared';
import { View } from 'react-native';
import { AppText, StatusChip, t, type, useTheme } from '@ab/mobile-kit';
import { useViewerTz } from '@/core/lib/clock';
import { packageLines } from './card-text';

export function PackageHead({ pkg }: { pkg: CourseCardPackage }) {
  const { color } = useTheme();
  const lines = packageLines(pkg, useViewerTz());
  const big = type.size.lg;
  const small = type.size.xs;
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <AppText
          style={{
            fontFamily: type.ui[700],
            fontSize: big,
            lineHeight: type.lineHeight(big),
            color: color.ink,
          }}
        >
          {lines.left}
        </AppText>
        <StatusChip
          {...subscriptionStatusStyle[pkg.status]}
          label={t.enums.subscriptionStatus[pkg.status]}
          size="sm"
        />
      </View>
      <AppText
        style={{
          fontFamily: type.ui[500],
          fontSize: small,
          lineHeight: type.lineHeight(small),
          color: color.ink2,
          fontVariant: ['tabular-nums'],
        }}
      >
        {lines.line}
      </AppText>
    </View>
  );
}
