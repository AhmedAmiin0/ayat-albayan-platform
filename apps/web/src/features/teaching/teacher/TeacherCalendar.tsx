import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Cartouche } from '@/components/ui/display/cartouche';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { SegmentedControl } from '@/components/ui/form/segmented-control';
import { PageHead } from '@/components/ui/layout/page';
import { t } from '@/lib/i18n/i18n';
import { teacherMeQuery } from './api';
import type { CalendarView } from './calendar-search';
import { LoadRetry } from './LoadRetry';
import { MyWeek } from './lessons/MyWeek';
import { TeacherAvailability } from './proposals/TeacherAvailability';

export interface TeacherCalendarProps {
  view: CalendarView;
  onView: (view: CalendarView) => void;
}

const OPTIONS = [
  { value: 'lessons' as const, label: t.teacherCalendar.lessons },
  { value: 'availability' as const, label: t.availability.title },
];

/** Her own availability and time-off, under the same «جدولي» head. */
function MyAvailability({ toggle }: { toggle: ReactNode }) {
  const me = useQuery(teacherMeQuery);
  const body = me.data ? <TeacherAvailability me={me.data} /> : <ListSkeleton />;
  return (
    <>
      <PageHead>
        <Cartouche>{t.teacherNav.calendar}</Cartouche>
        {toggle}
      </PageHead>
      {me.isError && !me.data ? <LoadRetry onRetry={me.refetch} /> : body}
    </>
  );
}

const VIEWS: Record<CalendarView, (toggle: ReactNode) => ReactNode> = {
  lessons: (toggle) => <MyWeek toggle={toggle} />,
  availability: (toggle) => <MyAvailability toggle={toggle} />,
};

/** /teacher/calendar «جدولي»: «الحلقات | المواعيد المتاحة» (docs/48 PR3, owner 2026-11-14). */
export function TeacherCalendar({ view, onView }: TeacherCalendarProps) {
  const toggle = (
    <SegmentedControl
      label={t.teacherCalendar.views}
      options={OPTIONS}
      value={view}
      onChange={onView}
      className="ms-auto"
    />
  );
  return VIEWS[view](toggle);
}
