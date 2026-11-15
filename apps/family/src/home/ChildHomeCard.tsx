import { newReportCount } from '@ab/client-core';
import type { PortalStudent } from '@ab/shared';
import { View } from 'react-native';
import { raisedCard, useTheme } from '@ab/mobile-kit';
import { LoadState } from '@/nav';
import { PackageLine } from '@/package';
import { useChildLessons, useChildPackage, useChildReports, useSeenReports } from '@/portal';
import { CardFigures } from './CardFigures';
import { CardHead } from './CardHead';
import { CardLessons } from './CardLessons';

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
  const lessons = useChildLessons(student.id);
  const pkg = useChildPackage(student.id, money).data;
  const reports = useChildReports(student.id).data?.reports ?? [];
  const fresh = newReportCount(reports, useSeenReports());
  const shownPkg = money ? pkg : undefined;
  return (
    <View style={{ ...raisedCard(color, 16), padding: 16, gap: 14 }}>
      <CardHead student={student} newReports={fresh} />
      <LoadState query={lessons}>
        {(data) => <CardLessons lessons={data} student={student} />}
      </LoadState>
      <CardFigures month={lessons.data?.month} pkg={shownPkg} />
      {shownPkg ? <PackageLine view={shownPkg} studentId={student.id} /> : null}
    </View>
  );
}
