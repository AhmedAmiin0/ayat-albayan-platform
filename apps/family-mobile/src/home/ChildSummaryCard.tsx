import { isSelfChild, packageSummary, reportAt } from '@ab/client-core';
import type { PortalKind, PortalReport, PortalStudent } from '@ab/shared';
import type { ClockOptions } from '@ab/time';
import { View } from 'react-native';
import { AppText, Chevron, t, type, useTheme } from '@ab/mobile-kit';
import { Figure, NewMark, PressCard, StudentIdentity } from '@/ui';
import { dateLine } from '@/lessons';
import { UsedBar } from '@/package';
import { useChildPackage, useChildSummary, useFamilyClock } from '@/portal';
import { ChildNextLine } from './ChildNextLine';

const count = (n: number | null): string => (n === null ? '–' : String(n));

/** On a guardian's own card the name reads "Me"; otherwise the student's name. */
const selfName = (kind: PortalKind, student: PortalStudent): string | undefined =>
  isSelfChild(kind, student) ? t.portal.app.pick.me : undefined;

function lastReportLine(last: PortalReport | null, clock: ClockOptions): string {
  const C = t.portal.app.children;
  if (!last) return C.noReport;
  return C.lastReport.replace('{date}', dateLine(new Date(reportAt(last)), clock));
}

/** Shown only to a viewer who sees money, and absent without a package. */
function PackageBar({ studentId }: { studentId: string }) {
  const pkg = useChildPackage(studentId, true).data?.package;
  return pkg ? <UsedBar summary={packageSummary(pkg)} /> : null;
}

interface ChildSummaryCardProps {
  student: PortalStudent;
  kind: PortalKind;
  /** The whole card is one button that switches to working as this child. */
  onPress: () => void;
}

export function ChildSummaryCard({ student, kind, onPress }: ChildSummaryCardProps) {
  const { color } = useTheme();
  const clock = { ...useFamilyClock(), tz: student.tz };
  const s = useChildSummary(student, kind);
  const C = t.portal.app.children;
  return (
    <PressCard
      label={`${student.name} ${student.code}`}
      hint={t.portal.app.home.open.replace('{name}', student.name)}
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
        <Figure tone="ink" value={count(s.upcoming)} label={C.upcoming} />
        <Figure tone="ok" value={count(s.month?.attended ?? null)} label={C.attended} />
        <Figure tone="bad" value={count(s.month?.absent ?? null)} label={C.absent} />
        {s.money ? <Figure tone="ink" value={count(s.remaining)} label={C.left} /> : null}
      </View>
      {s.money ? <PackageBar studentId={student.id} /> : null}
      <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: color.rule }}>
        <AppText style={{ fontSize: type.size.xs, color: color.ink2 }}>
          {lastReportLine(s.lastReport, clock)}
        </AppText>
      </View>
    </PressCard>
  );
}
