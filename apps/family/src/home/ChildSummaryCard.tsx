import type { PortalReport, PortalStudent } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { AppText, Avatar, Ltr, t, type, useTheme } from '@ab/mobile-kit';
import { dateLine, Figure, NewMark } from '@/lessons';
import { childHref, PressCard } from '@/nav';
import { useChildSummary, useFamilyClock } from '@/portal';


const count = (n: number | null): string => (n === null ? '–' : String(n));

/** «آخر تقرير · الخميس 13 نوفمبر», or «لم يصل تقرير بعد». */
function lastReportLine(last: PortalReport | null, clock: Parameters<typeof dateLine>[1]): string {
  const C = t.portal.app.children;
  if (!last) return C.noReport;
  return C.lastReport.replace('{date}', dateLine(new Date(last.lesson_starts_at ?? last.sent_at), clock));
}

/** One child on «أبنائي» (canvas Children): the last report, «جديد», and the counts → the child. */
export function ChildSummaryCard({ student }: { student: PortalStudent }) {
  const { color } = useTheme();
  const clock = { ...useFamilyClock(), tz: student.tz };
  const s = useChildSummary(student);
  const money = s.money;
  const C = t.portal.app.children;
  const lastLine = lastReportLine(s.lastReport, clock);
  return (
    <PressCard
      label={`${student.name} ${student.code}`}
      onPress={() => router.push(childHref(student.id))}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar name={student.name} id={student.id} decorative />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink }}>
            {student.name}
          </AppText>
          <Ltr style={{ fontSize: type.size.xs, color: color.ink2 }}>{student.code}</Ltr>
          <AppText style={{ fontSize: type.size.xs, color: color.ink3 }}>{lastLine}</AppText>
        </View>
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
