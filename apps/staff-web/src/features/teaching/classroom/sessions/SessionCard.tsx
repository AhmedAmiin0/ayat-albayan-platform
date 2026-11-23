import { clockOf, type LessonView } from '@ab/shared';
import type { SessionGroup } from '@ab/client-core';
import { useState } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { StatusChip } from '@ab/web-kit/components/ui/display/status-chip';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';
import { CopyLinkButton } from '@/features/teaching/classroom/join/CopyLinkButton';
import { SendLinkButton } from '@/features/teaching/classroom/join/SendLinkButton';
import { sessionChip } from './sessions';
import { StaffJoinButton } from '@/features/teaching/classroom/join/StaffJoinButton';
import { teacherLabel } from '@ab/web-kit/lib/i18n/teacher-label';
import { useClock } from '@ab/web-kit/lib/clock';
import { clockDir, viewerZone } from '@ab/web-kit/lib/clock-text';
import { useLessonStatusText } from '@ab/web-kit/lib/settings/lesson-status-text';

/** Join first and dominant; on phones link actions fold behind a menu, from 640px always shown. */
export function SessionCard({ lesson, group }: { lesson: LessonView; group: SessionGroup }) {
  const [more, setMore] = useState(false);
  const chip = sessionChip(lesson, group, useLessonStatusText().required);
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
