import { extendOffered, type CardTree } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { CoursePauseAction, CoursePausePanel } from '@/features/teaching/course-pause';
import { t } from '@/lib/i18n/i18n';
import { CourseActions } from '@/features/teaching/course-actions/CourseActions';
import { courseCardQuery } from './api';
import { CardBody } from './CardBody';

interface CourseCardPanelProps {
  studentId: string;
  /** The admin's file (default) or an assistant's screen. */
  tree?: CardTree;
}

/**
 * «الدورة والباقة» (owner 2026-11-17) on the student's file: the course (days, teacher and last
 * day, lessons without a date), «الحلقات القادمة», the pause's banner, then «إيقاف مؤقت», «تغيير
 * المعلم», «تغيير موعد الحلقات», «مدّ الجدول» and «إلغاء الاشتراك», each behind its key, with
 * what it does. The moves need a booked course (no dead end on course_not_found); what an action
 * did is said here after it.
 */
export function CourseCardPanel({ studentId, tree = 'admin' }: CourseCardPanelProps) {
  const card = useQuery(courseCardQuery({ studentId, tree })).data;
  const [notice, setNotice] = useState<string | null>(null);
  const booked = Boolean(card?.course);
  return (
    <section aria-labelledby="course-card" className="mb-6 grid gap-3 rounded-lg border border-rule p-4">
      <h2 id="course-card" className="text-base font-semibold text-ink">
        {t.courseCard.title}
      </h2>
      <CardBody card={card} />
      {notice && (
        <p role="status" className="rounded-md bg-sunk px-3.5 py-2.5 text-sm">
          {notice}
        </p>
      )}
      <CoursePausePanel studentId={studentId} onDone={setNotice} />
      <h3 className="text-xs font-semibold text-ink-3">{t.courseCard.actions}</h3>
      <div className="flex flex-wrap items-start gap-4">
        <CoursePauseAction
          studentId={studentId}
          onDone={setNotice}
          hint={t.courseCard.hints.pause}
        />
        {card?.subscriptionId && (
          <CourseActions
            studentId={studentId}
            subscriptionId={card.subscriptionId}
            mode="admin"
            onDone={setNotice}
            moves={booked}
            extend={extendOffered(card)}
          />
        )}
      </div>
    </section>
  );
}
