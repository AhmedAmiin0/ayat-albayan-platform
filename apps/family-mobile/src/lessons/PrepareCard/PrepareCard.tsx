import { View } from 'react-native';
import { AppText, type, useTheme } from '@ab/mobile-kit';
import { FromReport } from './FromReport';
import type { PrepareCardProps } from './PrepareCard.types';
import { BOX, prepareView, titleOf } from './prepare-card.helpers';

/** docs/50 §2: the newest sent report's homework and next plan. */
export function PrepareCard({ lessons, student, full = false, own = false }: PrepareCardProps) {
  const { color } = useTheme();
  const view = prepareView(lessons, full);
  const small = { fontSize: type.size['2xs'], color: color.ink3 };
  if (!view) return null;
  return (
    <View style={{ ...BOX, backgroundColor: color.goldWash }}>
      <View style={{ width: 4, borderRadius: 2, backgroundColor: color.gold }} />
      <View style={{ flex: 1, gap: 4 }}>
        <AppText
          style={{ fontFamily: type.ui[600], fontSize: type.size.xs, color: color.coverInk }}
        >
          {titleOf(full, own)}
        </AppText>
        {view.shown.map((p) => (
          <View key={p.key} style={{ gap: 2 }}>
            {full ? <AppText style={small}>{p.title}</AppText> : null}
            <AppText style={{ fontSize: type.size.sm, color: color.ink2 }}>{p.text}</AppText>
          </View>
        ))}
        {view.from ? (
          <FromReport student={student} reportId={view.reportId} at={view.from} />
        ) : null}
      </View>
    </View>
  );
}
