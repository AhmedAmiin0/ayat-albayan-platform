import { type ReactNode, useId, useState } from 'react';
import { Tabs, tabIds } from '@/components/ui/layout/tabs';
import { StudentReportsBody } from '@/features/reporting/reports';
import { Drawer } from '@/features/teaching/schedule';
import { t } from '@/lib/i18n/i18n';
import { AttendanceLog } from '@/features/teaching/teacher-board/attendance/AttendanceLog';
import type { BoardRow } from '@/features/teaching/teacher-board/board-rows';
import { StudentLessonsTab } from './StudentLessonsTab';

type Tab = 'lessons' | 'reports' | 'attendance';
const w = t.teacherBoard;
const TABS: { value: Tab; label: string }[] = [
  { value: 'lessons', label: w.lessonsTab },
  { value: 'reports', label: w.reportsTab },
  { value: 'attendance', label: w.attendanceTab },
];

export interface StudentDrawerProps {
  row: BoardRow;
  /** Her zone and fixed link, as on her cards. */
  tz: string;
  fallbackLink: string | null;
  onClose: () => void;
  onDone: (message: string) => void;
}

/** One student from the board (docs/46 C1): «الحلقات» | «التقارير» | «الحضور», one at a time. */
export function StudentDrawer({ row, tz, fallbackLink, onClose, onDone }: StudentDrawerProps) {
  const prefix = useId();
  const [tab, setTab] = useState<Tab>('lessons');
  const studentId = row.student.id;
  const panels: Record<Tab, () => ReactNode> = {
    lessons: () => (
      <StudentLessonsTab
        lessons={row.summary.lessons}
        tz={tz}
        fallbackLink={fallbackLink}
        onDone={onDone}
      />
    ),
    reports: () => <StudentReportsBody studentId={studentId} role="teacher" tz={tz} />,
    attendance: () => <AttendanceLog studentId={studentId} tz={tz} />,
  };
  const ids = tabIds(prefix, tab);
  return (
    <Drawer title={row.student.name} onClose={onClose}>
      <Tabs label={w.drawerTabs} tabs={TABS} value={tab} onChange={setTab} idPrefix={prefix} />
      <div role="tabpanel" id={ids.panel} aria-labelledby={ids.tab}>
        {panels[tab]()}
      </div>
    </Drawer>
  );
}
