import { packageSummary } from '@ab/client-core';
import { subscriptionStatusStyle, type PortalPackage } from '@ab/shared';
import { View } from 'react-native';
import { AppText, StatusChip, raisedCard, t, type, useTheme } from '@ab/mobile-kit';
import { amountText, dayDate, usedText } from './package-text';

/** The package (canvas Package): its name and state, «استُخدمت 8 من 12», the dates, what is due. */
export function PackageCard({ pkg }: { pkg: PortalPackage }) {
  const { color } = useTheme();
  const s = packageSummary(pkg);
  const P = t.portal.app.package;
  const name = P.title.replace('{n}', String(pkg.lessons_total));
  const ratio = s.total > 0 ? Math.min(1, s.used / s.total) : 0;
  const facts = [
    { label: P.start, value: dayDate(pkg.starts_on) },
    ...(s.renewsOn ? [{ label: P.renewal, value: dayDate(s.renewsOn) }] : []),
  ];
  const small = { fontSize: type.size.xs, color: color.ink3 };
  return (
    <View style={{ ...raisedCard(color, 16), padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.lg, color: color.ink }}>
            {name}
          </AppText>
          <AppText style={small}>{P.perLesson.replace('{n}', String(pkg.duration))}</AppText>
        </View>
        <StatusChip
          {...subscriptionStatusStyle[pkg.status]}
          size="sm"
          label={t.portal.packageStatus[pkg.status]}
        />
      </View>
      <AppText style={{ fontFamily: type.ui[600], color: color.ink }}>{usedText(s)}</AppText>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: color.sunk, overflow: 'hidden' }}>
        <View
          style={{
            width: `${Math.round(ratio * 100)}%`,
            height: 8,
            backgroundColor: color.lapisFill,
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 16 }}>
        {facts.map((f) => (
          <View key={f.label} style={{ gap: 2 }}>
            <AppText style={small}>{f.label}</AppText>
            <AppText style={{ fontFamily: type.ui[600], color: color.ink }}>{f.value}</AppText>
          </View>
        ))}
      </View>
      {s.amountDue ? (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            padding: 12,
            borderRadius: 12,
            backgroundColor: color.actSoft,
          }}
        >
          <AppText style={{ fontFamily: type.ui[600], color: color.act }}>
            {t.portal.amountDue}
          </AppText>
          <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.lg, color: color.act }}>
            {amountText(s.amountDue)}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}
