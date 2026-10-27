import { clockOf, type LessonView } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Icon } from '@/components/ui/display/icon';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { CopyLinkButton } from '../join/CopyLinkButton';
import { SendLinkButton } from '../join/SendLinkButton';
import { sessionChip, type SessionGroup } from './sessions';
import { StaffJoinButton } from '../join/StaffJoinButton';
import { teacherLabel } from '@/lib/i18n/teacher-label';
import { useClock } from '@/lib/clock';
import { clockDir, viewerZone } from '@/lib/clock-text';

/**
 * One session on /admin/classrooms: time range, students, teacher, a status chip and a live dot
 * while the room is open; the actions sit at the inline-end, «ادخل الحلقة» first and dominant.
 * On phones the link actions fold behind «خيارات أخرى»; from 640px they are always shown.
 */
export function SessionCard({ lesson, group }: { lesson: LessonView; group: SessionGroup }) {
  const [more, setMore] = useState(false);
  const chip = sessionChip(lesson, group);
  // Times in the viewer's own zone (the browser's), 12 or 24 h as chosen, Western digits.
  const clock = { ...useClock(), tz: viewerZone() };
  const time = t.classroom.admin.time
    .replace('{from}', clockOf(new Date(lesson.starts_at), clock))
    .replace('{to}', clockOf(new Date(lesson.ends_at), clock));
  return (
    <li className="ab-lift grid gap-3 rounded-md border border-rule bg-page p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div className="grid min-w-0 gap-1.5">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span dir={clockDir(clock)} className="text-lg font-semibold tabular-nums">
            {time}
          </span>
          {group === 'now' && <span aria-hidden="true" className="size-2 rounded-full bg-ok motion-safe:animate-pulse" />}
          <StatusChip size="sm" tone={chip.tone} glyph={chip.glyph} label={chip.label} />
        </p>
        <p className="font-semibold">
          <span className="text-xs font-normal text-ink-3">{t.classroom.admin.students} </span>
          {lesson.students.map((s) => s.name).join(t.common.listSeparator)}
        </p>
        <p className="text-sm text-ink-2">
          {t.classroom.admin.teacher} {teacherLabel(lesson.teacher)}
        </p>
      </div>
      <div className="grid justify-items-start gap-2 sm:justify-items-end">
        <StaffJoinButton lesson={lesson} />
        <Button type="button" variant="ghost" size="sm" aria-expanded={more} className="sm:hidden" onClick={() => setMore(!more)}>
          <Icon name="sliders" />
          {t.classroom.admin.more}
        </Button>
        <div className={cn('grid gap-2 sm:justify-items-end', !more && 'max-sm:hidden')}>
          <CopyLinkButton lesson={lesson} />
          <SendLinkButton lesson={lesson} />
        </div>
      </div>
    </li>
  );
}
