import { childSummary, portalViewer, seesMoney } from '@ab/client-core';
import type { PortalStudent } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { AppText, Avatar, Ltr, t, type, useNow, useTheme } from '@ab/mobile-kit';
import { dateLine, NewMark } from '@/lessons';
import { childHref, PressCard } from '@/nav';
import {
  useChildLessons,
  useChildPackage,
  useChildReports,
  useFamilyClock,
  useSeenReports,
} from '@/portal';
import { Figure } from '@/lessons';

const count = (n: number | null): string => (n === null ? '–' : String(n));

/** One child on «أبنائي» (canvas Children): the last report, «جديد», and the counts → the child. */
export function ChildSummaryCard({ student }: { student: PortalStudent }) {
  const { color } = useTheme();
  const clock = { ...useFamilyClock(), tz: student.tz };
  const money = seesMoney(portalViewer('guardian', student));
  const s = childSummary(
    {
      lessons: useChildLessons(student.id).data,
      reports: useChildReports(student.id).data,
      pkg: useChildPackage(student.id, money).data,
      seen: useSeenReports(),
    },
    useNow(),
  );
  const C = t.portal.app.children;
  const last = s.lastReport;
  const lastLine = last
    ? C.lastReport.replace(
        '{date}',
        dateLine(new Date(last.lesson_starts_at ?? last.sent_at), clock),
      )
    : C.noReport;
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
