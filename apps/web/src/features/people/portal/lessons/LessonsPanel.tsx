import { lessonStatusStyle, type PortalStudent, type RoomJoinResult } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { EmptyState } from '@/components/ui/display/empty-state';
import { StatusChip } from '@/components/ui/display/status-chip';
import { ClassroomRoom } from '@/features/teaching/classroom';
import { useNow } from '@/lib/time/use-now';
import { t } from '@/lib/i18n/i18n';
import { teacherLabel } from '@/lib/i18n/teacher-label';
import { PORTAL_REFRESH_MS, portalLessonsQuery } from '@/features/people/portal/api';
import { LessonAction } from './LessonAction';
import { LessonWhen } from './LessonWhen';
import { LoadState } from '@/features/people/portal/LoadState';

/**
 * «الحلقات القادمة»: the next 14 days, one card per lesson, re-read every 30 seconds. Once admitted, the
 * classroom covers the page (as on the student's own link) until it ends.
 */
export function LessonsPanel({ student }: { student: PortalStudent }) {
  const now = useNow(PORTAL_REFRESH_MS);
  const query = useQuery(portalLessonsQuery(student.id));
  const [room, setRoom] = useState<RoomJoinResult | null>(null);
  if (room) {
    return (
      <div className="fixed inset-0 z-50 overflow-auto bg-page">
        <ClassroomRoom join={room} onRejoin={() => setRoom(null)} />
      </div>
    );
  }
  return (
    <LoadState query={query}>
      {({ lessons }) =>
        lessons.length === 0 ? (
          <EmptyState title={t.portal.lessonsEmpty}>{t.portal.lessonsEmptyHint}</EmptyState>
        ) : (
          <ul className="grid gap-3">
            {lessons.map((lesson) => (
              <li key={lesson.id} className="grid gap-3 rounded-lg border border-rule bg-raised p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <LessonWhen startsAt={lesson.starts_at} tz={student.tz} />
                  <StatusChip {...lessonStatusStyle[lesson.status]} label={t.enums.lessonStatus[lesson.status]} size="sm" />
                </div>
                {lesson.teacher.display_name_ar && (
                  <p className="text-sm text-ink-2">{t.portal.withTeacher.replace('{teacher}', teacherLabel(lesson.teacher))}</p>
                )}
                <LessonAction lesson={lesson} studentId={student.id} tz={student.tz} now={now} onJoined={setRoom} />
              </li>
            ))}
          </ul>
        )
      }
    </LoadState>
  );
}
