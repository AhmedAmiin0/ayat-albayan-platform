import { reportAt } from '@ab/client-core';
import type { ClockOptions, PortalKind, PortalReport, PortalStudent } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { AppText, Avatar, Ltr, t, type, useTheme } from '@ab/mobile-kit';
import { Figure, NewMark, PressCard, StudentIdentity } from '@/ui';
import { dateLine } from '@/lessons';
import { childHref } from '@/nav';
import { useChildSummary, useFamilyClock } from '@/portal';

const count = (n: number | null): string => (n === null ? '–' : String(n));

/** «آخر تقرير · الخميس 13 نوفمبر», or «لم يصل تقرير بعد». */
function lastReportLine(last: PortalReport | null, clock: ClockOptions): string {
  const C = t.portal.app.children;
  if (!last) return C.noReport;
  return C.lastReport.replace('{date}', dateLine(new Date(reportAt(last)), clock));
}

/** One child on «أبنائي» (canvas Children): the last report, «جديد», and the counts → the child. */
export function ChildSummaryCard({ student, kind }: { student: PortalStudent; kind: PortalKind }) {
  const { color } = useTheme();
  const clock = { ...useFamilyClock(), tz: student.tz };
  const s = useChildSummary(student, kind);
  const money = s.money;
  const C = t.portal.app.children;
  const lastLine = lastReportLine(s.lastReport, clock);
  return (
    <PressCard
      label={`${student.name} ${student.code}`}
      onPress={() => router.push(childHref(student.id))}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <StudentIdentity student={student}>
          <AppText style={{ fontSize: type.size.xs, color: color.ink3 }}>{lastLine}</AppText>
        </StudentIdentity>
        {s.newReports > 0 ? <NewMark /> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Figure tone="ink" value={count(s.upcoming)} label={C.upcoming} />
        <Figure tone="ok" value={count(s.month?.attended ?? null)} label={C.attended} />
        <Figure tone="bad" value={count(s.month?.absent ?? null)} label={C.absent} />
        {money ? <Figure tone="ink" value={count(s.remaining)} label={C.left} /> : null}
      </View>
    </PressCard>
  );
}
