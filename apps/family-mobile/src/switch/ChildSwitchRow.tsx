import { isSelfChild, newReportCount, nextLesson } from '@ab/client-core';
import type { PortalKind, PortalStudent } from '@ab/shared';
import { Avatar, ListRow, t, useNow, useTheme } from '@ab/mobile-kit';
import Svg, { Path } from 'react-native-svg';
import { whenText } from '@/lessons';
import { NewMark } from '@/ui';
import { useChildLessons, useChildReports, useFamilyClock, useSeenReports } from '@/portal';

/** ✓ beside the child in view (decorative: the row's name says it). */
function Check({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden>
      <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

/** «الحلقة القادمة · اليوم 6:30 م» on the child's own clock, once their lessons are known. */
function useNextLine(student: PortalStudent): string | undefined {
  const lessons = useChildLessons(student.id).data;
  const now = useNow();
  const clock = { ...useFamilyClock(), tz: student.tz };
  const next = lessons ? nextLesson(lessons.lessons, now) : null;
  const when = next ? whenText(new Date(next.starts_at), clock, now) : null;
  return when ? t.portal.app.pick.next.replace('{when}', when) : undefined;
}

interface ChildSwitchRowProps {
  student: PortalStudent;
  kind: PortalKind;
  /** The child the app works as now. */
  current: boolean;
  onPress: () => void;
}

/**
 * One child in the switch sheet (canvas SwitchSheet): avatar, name («أنا» for a guardian's own
 * row), code, the next lesson; ✓ on the current one, «جديد» while a report waits unopened.
 */
export function ChildSwitchRow({ student, kind, current, onPress }: ChildSwitchRowProps) {
  const { color } = useTheme();
  const reports = useChildReports(student.id).data?.reports ?? [];
  const fresh = newReportCount(reports, useSeenReports()) > 0;
  const name = isSelfChild(kind, student) ? t.portal.app.pick.me : student.name;
  const mark = fresh ? <NewMark /> : undefined;
  const next = useNextLine(student);
  return (
    <ListRow
      leading={<Avatar name={student.name} id={student.id} decorative />}
      title={name}
      meta={student.code}
      metaStrong
      subtitle={next}
      trailing={current ? <Check color={color.lapis} /> : mark}
      onPress={onPress}
      accessibilityHint={current ? t.portal.app.pick.current : undefined}
    />
  );
}
