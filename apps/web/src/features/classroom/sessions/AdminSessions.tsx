import { intlLocale, type LessonView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { TableBox } from '@/components/TableBox';
import { Button } from '@/components/ui/form/button';
import { Cartouche } from '@/components/ui/display/cartouche';
import { EmptyState } from '@/components/ui/display/empty-state';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Icon } from '@/components/ui/display/icon';
import { PageHead } from '@/components/ui/layout/page';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { InternalMeetingsList } from '@/features/meetings/internal/InternalMeetingsList';
import { NewMeetingMenu } from '@/features/meetings/NewMeetingMenu';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';
import { useJoinWindow } from '@/lib/settings/public-config';
import { adminDayQuery, dayAround } from '../api/api';
import { SessionCard } from './SessionCard';
import { groupSessions, SESSION_GROUPS, type SessionGroup } from './sessions';
import { useNow } from './use-now';

// The day in the UI language with Western digits («الاثنين 5 أكتوبر»), not English.
const DAY = new Intl.DateTimeFormat(intlLocale(locale), { weekday: 'long', day: 'numeric', month: 'long' });

function Group({ group, lessons }: { group: SessionGroup; lessons: LessonView[] }) {
  const id = `sessions-${group}`;
  return (
    <section aria-labelledby={id} className="grid content-start gap-2.5">
      <h3 id={id} className="flex items-baseline gap-2 text-base font-bold">
        {t.classroom.admin.groups[group]}
        <span className="text-sm font-normal text-ink-3 tabular-nums">{lessons.length}</span>
      </h3>
      {lessons.length === 0 ? (
        <p className="rounded-md border border-dashed border-rule px-4 py-3 text-sm text-ink-3">{t.classroom.admin.groupEmpty[group]}</p>
      ) : (
        <ul className="grid gap-2.5">
          {lessons.map((l) => (
            <SessionCard key={l.id} lesson={l} group={group} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** Previous / today / next and the day itself: one compact row. */
function DaySwitcher({ offset, onOffset, day }: { offset: number; onOffset: (n: number) => void; day: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Button type="button" variant="secondary" size="sm" aria-label={t.schedule.prevDay} onClick={() => onOffset(offset - 1)}>
        <Icon name="chevron-right" />
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={() => onOffset(0)} disabled={offset === 0}>
        {t.schedule.today}
      </Button>
      <Button type="button" variant="secondary" size="sm" aria-label={t.schedule.nextDay} onClick={() => onOffset(offset + 1)}>
        <Icon name="chevron-left" />
      </Button>
      <h2 className="ms-1 text-lg font-bold">
        {day}
      </h2>
    </div>
  );
}

/**
 * /admin/classrooms («الحلقات عبر الإنترنت»): every teacher's lessons of a day in three groups,
 * «الآن» (room open), «قادمة», «انتهت», each lesson a card with its actions. The header keeps an
 * actions slot (`actions`) for more entries next to «اجتماع جديد»; the groups scroll in a
 * fixed-height box like the tables.
 */
export function AdminSessions({ actions }: { actions?: ReactNode }) {
  const [offset, setOffset] = useState(0);
  const now = useNow();
  const win = useJoinWindow();
  const day = dayAround(new Date(), offset);
  const lessons = useQuery(adminDayQuery(day));
  const groups = groupSessions(lessons.data ?? [], now, win);
  const none = SESSION_GROUPS.every((g) => groups[g].length === 0);
  let body: ReactNode = <ListSkeleton />;
  if (lessons.isError) body = <FormAlert>{t.common.error}</FormAlert>;
  else if (lessons.isSuccess && none) body = <EmptyState title={t.classroom.admin.empty} />;
  else if (lessons.isSuccess) body = SESSION_GROUPS.map((g) => <Group key={g} group={g} lessons={groups[g]} />);
  return (
    <section aria-label={t.classroom.admin.title} className="flex flex-1 flex-col">
      <PageHead>
        <Cartouche>{t.classroom.admin.title}</Cartouche>
        <div data-slot="header-actions" className="ms-auto flex flex-wrap items-center gap-2.5">
          {actions}
          <NewMeetingMenu />
        </div>
      </PageHead>
      <DaySwitcher offset={offset} onOffset={setOffset} day={DAY.format(new Date(day.from))} />
      <TableBox center={lessons.isSuccess && none} className="gap-6 border-0 p-0.5">
        {body}
      </TableBox>
      <InternalMeetingsList />
    </section>
  );
}
