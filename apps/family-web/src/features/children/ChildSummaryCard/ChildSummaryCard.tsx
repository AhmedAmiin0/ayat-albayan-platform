import { isSelfChild } from '@ab/client-core';
import { Button, Card, t } from '@ab/web-kit';
import { ReadState } from '@/features/children/ReadState';
import { SummaryFigures } from '@/features/children/SummaryFigures';
import { CardHead } from './CardHead';
import { CardLesson } from './CardLesson';
import type { ChildSummaryCardProps } from './ChildSummaryCard.types';
import { useChildSummaryCard } from './use-child-summary-card';

export function ChildSummaryCard({ student, kind, onChoose }: ChildSummaryCardProps) {
  const { read, lesson } = useChildSummaryCard({ student, kind });
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
