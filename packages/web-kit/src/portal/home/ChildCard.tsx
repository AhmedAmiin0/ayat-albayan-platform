import { nextLesson, PORTAL_REFRESH_MS } from '@ab/client-core';
import type { PortalLessons, PortalStudent } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { portalLessonsQuery } from '@ab/web-kit/portal/api';
import { LessonCard } from '@ab/web-kit/portal/lessons/LessonCard';
import { PrepareCard } from '@ab/web-kit/portal/lessons/PrepareCard';
import { QueryState } from '@ab/web-kit/components/ui/display/query-state';
import { MonthCounts } from './MonthCounts';
import { NewReports } from './NewReports';
import { PackageLine } from './PackageLine';

interface Props {
  student: PortalStudent;
  /** The package summary: a guardian's (seesMoney). */
  money: boolean;
  onOpen: () => void;
}

function CardLessons({ lessons, student }: { lessons: PortalLessons; student: PortalStudent }) {
  const next = nextLesson(lessons.lessons, useNow(PORTAL_REFRESH_MS));
  return (
    <>
      <section aria-label={t.portal.nextLesson} className="grid gap-2">
        <h3 className="text-sm font-semibold text-ink-2">{t.portal.nextLesson}</h3>
        {next ? (
          <LessonCard lesson={next} student={student} />
        ) : (
          <p className="text-sm text-ink-3">{t.portal.lessonsEmpty}</p>
        )}
      </section>
      <PrepareCard lessons={lessons} />
      <MonthCounts month={lessons.month} />
    </>
  );
}

/** One child on the guardian's home (docs/50 §6). */
export function ChildCard({ student, money, onOpen }: Props) {
  const lessons = useQuery(portalLessonsQuery(student.id));
  return (
    <article
      aria-label={student.name}
      className="grid animate-fade-up gap-4 rounded-lg border border-rule bg-raised p-4"
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid gap-0.5">
          <h2 className="font-display text-h3 font-bold">{student.name}</h2>
          <p className="text-xs text-ink-3 tabular-nums">
            {t.portal.code.replace('{code}', student.code)}
          </p>
        </div>
        <NewReports studentId={student.id} />
      </header>
      <QueryState query={lessons} rows={2}>
        {(data) => <CardLessons lessons={data} student={student} />}
      </QueryState>
      {money && <PackageLine studentId={student.id} />}
      <Button type="button" variant="secondary" className="justify-self-start" onClick={onOpen}>
        {t.portal.openChild}
      </Button>
    </article>
  );
}
