import { isSelfChild } from '@ab/client-core';
import type { PortalKind, PortalStudent } from '@ab/shared';
import { counted } from '@ab/core';
import { Avatar, Button, Card, Pill, SectionHeader, t } from '@ab/web-kit';
import { NextLessonDetails, useNextLesson, type NextLessonRead } from '@/features/next-lesson';
import { ReadState } from '@/features/children/ReadState';
import { SummaryFigures } from '@/features/children/SummaryFigures';
import { useChildSummary } from '@/features/children/use-child-summary';

interface Props {
  student: PortalStudent;
  kind: PortalKind;
  onChoose: () => void;
}

interface HeadProps {
  student: PortalStudent;
  self: boolean;
  newReports: number;
}

function CardHead({ student, self, newReports }: HeadProps) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={student.name} id={student.id} decorative />
        <div className="grid min-w-0 gap-0.5">
          <h2 className="font-display text-h3 font-bold">
            {student.name}
            {self && (
              <span className="ms-2 text-xs font-semibold text-ink-2">{t.portal.app.pick.me}</span>
            )}
          </h2>
          <p className="text-xs text-ink-3 tabular-nums">
            {t.portal.code.replace('{code}', student.code)}
          </p>
        </div>
      </div>
      {newReports > 0 && <Pill tone="act">{counted(t.portal.newReports, newReports)}</Pill>}
    </header>
  );
}

/** The join button shows only while its window is open. */
function CardLesson({ student, read }: { student: PortalStudent; read: NextLessonRead }) {
  return (
    <section aria-label={t.portal.nextLesson} className="grid gap-2">
      <SectionHeader title={t.portal.nextLesson} level={3} className="min-h-0" />
      {read.next ? (
        <NextLessonDetails lesson={read.next} student={student} now={read.now} open={read.open} />
      ) : (
        <p className="text-sm text-ink-3">{t.portal.lessonsEmpty}</p>
      )}
    </section>
  );
}

export function ChildSummaryCard({ student, kind, onChoose }: Props) {
  const read = useChildSummary(student, kind);
  const lesson = useNextLesson(student.id);
  return (
    <Card asChild className="grid gap-4 p-4 sm:p-5">
      <article aria-label={student.name}>
        <CardHead
          student={student}
          self={isSelfChild(kind, student)}
          newReports={read.summary.newReports}
        />
        <ReadState read={read}>
          <CardLesson student={student} read={lesson} />
          <SummaryFigures
            summary={read.summary}
            pkg={read.pkg}
            tz={student.tz}
            studentId={student.id}
          />
        </ReadState>
        <Button
          type="button"
          variant={lesson.open ? 'secondary' : 'primary'}
          className="justify-self-stretch sm:justify-self-start"
          onClick={onChoose}
        >
          {t.portal.app.home.open.replace('{name}', student.name)}
        </Button>
      </article>
    </Card>
  );
}
