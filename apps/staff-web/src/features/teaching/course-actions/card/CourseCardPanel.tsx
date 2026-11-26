import { extendOffered, type CardTree } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { CoursePauseAction, CoursePausePanel } from '@/features/teaching/course-pause';
import { t } from '@ab/web-kit';
import { CourseActions } from '@/features/teaching/course-actions/CourseActions';
import { courseCardQuery } from './api';
import { CardBody } from './CardBody';

interface CourseCardPanelProps {
  studentId: string;
  /** The admin's file (default) or an assistant's screen. */
  tree?: CardTree;
  /** The guardian's phone: the stop's done block opens the chat. */
  chatPhone?: string | undefined;
}

const GROUP = 'grid content-start gap-3';
const HEAD = 'text-xs font-semibold text-ink-3';

/** Each action behind its key; moves need a booked course (no dead end on course_not_found). */
export function CourseCardPanel({ studentId, tree = 'admin', chatPhone }: CourseCardPanelProps) {
  const card = useQuery(courseCardQuery({ studentId, tree })).data;
  const [notice, setNotice] = useState<string | null>(null);
  const subscriptionId = card?.subscriptionId ?? null;
  const shared = { studentId, mode: 'admin', onDone: setNotice, chatPhone } as const;
  return (
    <section aria-labelledby="course-card" className="mb-6 grid gap-3 rounded-lg border border-rule p-4">
      <CardBody card={card} onDone={setNotice} />
      {notice && (
        <p role="status" className="rounded-md bg-sunk px-3.5 py-2.5 text-sm">
          {notice}
        </p>
      )}
      <CoursePausePanel studentId={studentId} onDone={setNotice} />
      <div className="grid gap-5 sm:grid-cols-2">
        <section aria-label={t.courseCard.courseGroup} className={GROUP}>
          <h3 className={HEAD}>{t.courseCard.courseGroup}</h3>
          <CoursePauseAction
            studentId={studentId}
            onDone={setNotice}
            hint={t.courseCard.hints.pause}
          />
          {subscriptionId && (
            <CourseActions
              {...shared}
              subscriptionId={subscriptionId}
              group="course"
              moves={Boolean(card?.course)}
              extend={extendOffered(card)}
            />
          )}
        </section>
        {subscriptionId && (
          <section aria-label={t.courseCard.packageActions} className={GROUP}>
            <h3 className={HEAD}>{t.courseCard.packageActions}</h3>
            <CourseActions {...shared} subscriptionId={subscriptionId} group="package" />
          </section>
        )}
      </div>
    </section>
  );
}
