import { newReportCount, nextLesson } from '@ab/client-core';
import type { PortalStudent } from '@ab/shared';
import { View } from 'react-native';
import { AppText, SkeletonCard, raisedCard, t, type, useNow, useTheme } from '@ab/mobile-kit';
import { NextLessonCard, PrepareCard } from '@/lessons';
import { PackageLine } from '@/package';
import { useChildLessons, useChildPackage, useChildReports, useSeenReports } from '@/portal';
import { CardFigures } from './CardFigures';
import { CardHead } from './CardHead';

interface ChildHomeCardProps {
  student: PortalStudent;
  /** The package and its money: a guardian's (seesMoney). */
  money: boolean;
}

/**
 * One child on the guardian's home (docs/50 §6, canvas Home): the next lesson with its live
 * countdown and «ادخل الحلقة», «ما المطلوب», this month's counts and the package summary.
 */
export function ChildHomeCard({ student, money }: ChildHomeCardProps) {
  const { color } = useTheme();
  const now = useNow();
  const lessons = useChildLessons(student.id);
  const pkg = useChildPackage(student.id, money);
  const reports = useChildReports(student.id).data?.reports ?? [];
  const fresh = newReportCount(reports, useSeenReports());
  const next = lessons.data ? nextLesson(lessons.data.lessons, now) : null;
  const muted = { fontSize: type.size.sm, color: color.ink3 };
  return (
    <View style={{ ...raisedCard(color, 16), padding: 16, gap: 14 }}>
      <CardHead student={student} newReports={fresh} />
      {lessons.data ? null : <SkeletonCard />}
      {lessons.data && next ? <NextLessonCard lesson={next} student={student} /> : null}
      {lessons.data && !next ? <AppText style={muted}>{t.portal.lessonsEmpty}</AppText> : null}
      {lessons.data ? <PrepareCard lessons={lessons.data} student={student} /> : null}
      <CardFigures month={lessons.data?.month} pkg={money ? pkg.data : undefined} />
      {money && pkg.data ? <PackageLine view={pkg.data} studentId={student.id} /> : null}
    </View>
  );
}
