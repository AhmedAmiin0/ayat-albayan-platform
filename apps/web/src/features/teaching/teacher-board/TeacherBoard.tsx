import { boardStudents, countByKind, type LessonView, type TeacherMe } from '@ab/shared';
import { useNavigate } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { EmptyState } from '@/components/ui/display/empty-state';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { BoardHead } from './BoardHead';
import { DEFAULT_SEGMENT, EMPTY_TITLE, type BoardSegment } from './board-segments';
import { boardRows, searchRows, type BoardRow } from './board-rows';
import { boardColumns } from './cells/board-columns';
import { useStudentFacts } from './student-facts';

export interface TeacherBoardProps {
  me: TeacherMe;
  /** Her lessons in the board window (boardWindow), in her zone `me.tz`. */
  lessons: readonly LessonView[];
  now: Date;
  /** Unused since rows open the student file; the home panel still passes it (docs/48 PR3). */
  onDone?: ((message: string) => void) | undefined;
}

type View = 'empty' | 'noMatch' | 'table';

/** While the box holds a search, it runs over all her students whatever the segment. */
const searchedKind = (segment: BoardSegment, q: string): BoardSegment =>
  q.trim() === '' ? segment : 'all';

/** An empty segment, else a search that matched nothing, else the table. */
const viewOf = (segmentRows: number, shown: number): View =>
  ([
    ['empty', segmentRows === 0],
    ['noMatch', shown === 0],
  ] as const).find(([, holds]) => holds)?.[0] ?? 'table';

/**
 * «طلابي» (docs/46 C1, D4; docs/48): her current students «مشترك · تجريبي · الكل» with a search,
 * each one's last and next lesson, last report and attendance in the window, soonest next lesson
 * first. The same board serves /teacher/students and the home tab; a row opens «ملف الطالب».
 */
export function TeacherBoard({ me, lessons, now }: TeacherBoardProps) {
  const [segment, setSegment] = useState<BoardSegment>(DEFAULT_SEGMENT);
  const [q, setQ] = useState('');
  const facts = useStudentFacts();
  const navigate = useNavigate();
  const counts = countByKind(boardStudents(me.students, 'all'));
  const kind = searchedKind(segment, q);
  const rows = boardRows(me.students, { lessons, kind, now });
  const shown = searchRows(rows, { q, facts });
  const open = (r: BoardRow) =>
    void navigate({ to: '/teacher/students/$studentId', params: { studentId: r.student.id } });
  const views: Record<View, () => ReactNode> = {
    empty: () => <EmptyState title={EMPTY_TITLE[segment]}>{t.teacherBoard.emptyHint}</EmptyState>,
    noMatch: () => (
      <EmptyState
        title={t.teacherBoard.noMatch}
        action={
          <Button type="button" variant="secondary" onClick={() => setQ('')}>
            {t.teacherBoard.clearSearch}
          </Button>
        }
      />
    ),
    table: () => (
      <DataTable
        stacked
        clientSort
        label={t.teacherBoard.tab}
        columns={boardColumns({ tz: me.tz, facts })}
        data={shown}
        getRowId={(r) => r.student.id}
        onRowClick={open}
      />
    ),
  };
  return (
    <section aria-label={t.teacherBoard.tab} className="grid gap-3">
      <BoardHead
        segment={segment}
        counts={counts}
        onSegment={setSegment}
        search={{ q, onSearch: setQ }}
      />
      {views[viewOf(rows.length, shown.length)]()}
    </section>
  );
}
