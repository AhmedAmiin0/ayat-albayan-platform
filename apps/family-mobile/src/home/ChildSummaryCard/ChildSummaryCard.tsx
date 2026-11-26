import { View } from 'react-native';
import { AppText, Chevron, type, useTheme } from '@ab/mobile-kit';
import { Figure, NewMark, PressCard, StudentIdentity } from '@/ui';
import { ChildNextLine } from '@/home/ChildNextLine';
import { count, selfName } from './child-summary-card.helpers';
import type { ChildSummaryCardProps } from './ChildSummaryCard.types';
import { PackageBar } from './PackageBar';
import { useChildSummaryCard } from './use-child-summary-card';

export function ChildSummaryCard({ student, kind, onPress }: ChildSummaryCardProps) {
  const { color } = useTheme();
  const { clock, s, words, hint, lastLine } = useChildSummaryCard({ student, kind });
  return (
    <PressCard
      label={`${student.name} ${student.code}`}
      hint={hint}
      onPress={onPress}
      style={{ gap: 14 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <StudentIdentity student={student} name={selfName(kind, student)} />
        {s.newReports > 0 ? <NewMark /> : null}
        <Chevron to="next" color={color.ink3} />
      </View>
      <ChildNextLine student={student} clock={clock} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Figure tone="ink" value={count(s.upcoming)} label={words.upcoming} />
        <Figure tone="ok" value={count(s.month?.attended ?? null)} label={words.attended} />
        <Figure tone="bad" value={count(s.month?.absent ?? null)} label={words.absent} />
        {s.money ? <Figure tone="ink" value={count(s.remaining)} label={words.left} /> : null}
      </View>
      {s.money ? <PackageBar studentId={student.id} /> : null}
      <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: color.rule }}>
        <AppText style={{ fontSize: type.size.xs, color: color.ink2 }}>{lastLine}</AppText>
      </View>
    </PressCard>
  );
}
