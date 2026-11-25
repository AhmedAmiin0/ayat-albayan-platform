import type { LessonView } from '@ab/schedule';
import { dateText } from '@ab/time';
import { SESSION_GROUPS, type SessionGroup } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { TableBox } from '@/components/data-table/TableBox';
import {
  Button,
  Cartouche,
  EmptyState,
  FormAlert,
  Icon,
  PageHead,
  ListSkeleton,
  t,
  locale,
  useJoinWindow,
  adminDayQuery,
  dayAround,
  useNow,
  viewerZone,
} from '@ab/web-kit';
import { InternalMeetingsList } from '@/features/teaching/meetings/internal/InternalMeetingsList';
import { NewMeetingMenu } from '@/features/teaching/meetings/NewMeetingMenu';
import { SessionCard } from './SessionCard';
import { groupSessions } from './sessions';

// The day in the UI language with Western digits, not English.
const DAY = { weekday: 'long', day: 'numeric', month: 'long' } as const;
const dayText = (iso: string): string => dateText(new Date(iso), { tz: viewerZone(), locale }, DAY);

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

/** A day's lessons in now, upcoming and ended groups; `actions` adds header entries. */
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
      <DaySwitcher offset={offset} onOffset={setOffset} day={dayText(day.from)} />
      <TableBox center={lessons.isSuccess && none} className="gap-6 border-0 p-0.5">
        {body}
      </TableBox>
      <InternalMeetingsList />
    </section>
  );
}
