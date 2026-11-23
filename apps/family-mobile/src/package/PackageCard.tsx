import { packageSummary } from '@ab/client-core';
import type { PortalPackage } from '@ab/shared';
import { subscriptionStatusStyle } from '@ab/money';
import { View } from 'react-native';
import { AppText, StatusChip, raisedCard, t, type, useTheme } from '@ab/mobile-kit';
import { DueBox } from './DueBox';
import { dayDate } from './package-text';
import { UsedBar } from './UsedBar';

/** «البداية» and «التجديد» (the renewal when known). */
const factsOf = (pkg: PortalPackage) => [
  { label: t.portal.app.package.start, value: dayDate(pkg.starts_on) },
  ...(pkg.renews_on
    ? [{ label: t.portal.app.package.renewal, value: dayDate(pkg.renews_on) }]
    : []),
];

/** The package (canvas Package): its name and state, «استُخدمت 8 من 12», the dates, what is due. */
export function PackageCard({ pkg }: { pkg: PortalPackage }) {
  const { color } = useTheme();
  const s = packageSummary(pkg);
  const P = t.portal.app.package;
  const small = { fontSize: type.size.xs, color: color.ink3 };
  return (
    <View style={{ ...raisedCard(color, 16), padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.lg, color: color.ink }}>
            {P.title.replace('{n}', String(pkg.lessons_total))}
          </AppText>
          <AppText style={small}>{P.perLesson.replace('{n}', String(pkg.duration))}</AppText>
        </View>
        <StatusChip
          {...subscriptionStatusStyle[pkg.status]}
          size="sm"
          label={t.portal.packageStatus[pkg.status]}
        />
      </View>
      <UsedBar summary={s} />
      <View style={{ flexDirection: 'row', gap: 16 }}>
        {factsOf(pkg).map((f) => (
          <View key={f.label} style={{ gap: 2 }}>
            <AppText style={small}>{f.label}</AppText>
            <AppText style={{ fontFamily: type.ui[600], color: color.ink }}>{f.value}</AppText>
          </View>
        ))}
      </View>
      {s.amountDue ? <DueBox due={s.amountDue} /> : null}
    </View>
  );
}
