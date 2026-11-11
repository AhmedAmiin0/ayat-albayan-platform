import { boardStudents, countByKind, type StudentListKind, type TeacherMe } from '@ab/shared';
import type { LessonView } from '@ab/shared';
import { useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { EmptyState } from '@/components/ui/display/empty-state';
import { SegmentedControl } from '@/components/ui/form/segmented-control';
import { t } from '@/lib/i18n/i18n';
import { boardRows } from './board-rows';
import { boardColumns } from './cells/board-columns';
import { StudentDrawer } from './drawer/StudentDrawer';

export interface TeacherBoardProps {
  me: TeacherMe;
  /** Her lessons in the board window (boardWindow), in her zone `me.tz`. */
  lessons: readonly LessonView[];
  now: Date;
  onDone: (message: string) => void;
}

const L = t.studentLists;

/**
 * «طلابي» (docs/46 C1, D4): her current students «مشترك · تجريبي · الكل» with each one's last and
 * next lesson, last report and attendance in the window; a row opens the student's drawer.
 */
export function TeacherBoard({ me, lessons, now, onDone }: TeacherBoardProps) {
  const [kind, setKind] = useState<StudentListKind>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const counts = countByKind(boardStudents(me.students, 'all'));
  const rows = boardRows(me.students, { lessons, kind, now });
  const open = rows.find((r) => r.student.id === openId);
  const options = [
    { value: 'active' as const, label: L.active, count: counts.active },
    { value: 'trial' as const, label: L.trial, count: counts.trial },
    { value: 'all' as const, label: L.all, count: counts.all },
  ];
  const columns = boardColumns({ tz: me.tz, onOpen: (r) => setOpenId(r.student.id) });
  return (
    <section aria-label={t.teacherBoard.tab} className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          label={t.teacherBoard.kinds}
          options={options}
          value={kind}
          onChange={setKind}
        />
        <span className="text-xs text-ink-3">{t.teacherBoard.window}</span>
      </div>
      {rows.length === 0 ? (
        <EmptyState title={t.teacherBoard.noStudents} />
      ) : (
        <DataTable
          stacked
          clientSort
          label={t.teacherBoard.tab}
          columns={columns}
          data={rows}
          getRowId={(r) => r.student.id}
          onRowClick={(r) => setOpenId(r.student.id)}
        />
      )}
      {open && (
        <StudentDrawer
          row={open}
          tz={me.tz}
          fallbackLink={me.meeting_link}
          onClose={() => setOpenId(null)}
          onDone={onDone}
        />
      )}
    </section>
  );
}
