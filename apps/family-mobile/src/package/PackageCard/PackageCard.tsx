import { packageSummary } from '@ab/client-core';
import { subscriptionStatusStyle } from '@ab/money';
import { View } from 'react-native';
import { AppText, StatusChip, raisedCard, t, type, useTheme } from '@ab/mobile-kit';
import { DueBox } from '@/package/DueBox';
import { UsedBar } from '@/package/UsedBar';
import type { PackageCardProps } from './PackageCard.types';
import { factsOf } from './package-card.helpers';

export function PackageCard({ pkg }: PackageCardProps) {
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
