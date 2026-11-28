import { useQuery } from '@tanstack/react-query';
import {
  Cartouche,
  EmptyState,
  ListSkeleton,
  Button,
  FormAlert,
  PageHead,
  t,
  useViewerTz,
  teacherChannelsQuery,
  ChannelThread,
} from '@ab/web-kit';
import { TeacherChannelList } from './TeacherChannelList';

interface Props {
  /** ?student= (a push opens it); null = the list alone on a phone, the first prompt when wide. */
  studentId: string | null;
  onPick: (studentId: string | null) => void;
}

/** Family channels (docs/31 §2); on a phone list and thread take turns, side by side from 900px. */
export function TeacherMessagesPage({ studentId, onPick }: Props) {
  const tz = useViewerTz();
  const list = useQuery(teacherChannelsQuery);
  const rows = list.data ?? [];
  const picked = rows.some((r) => r.student_id === studentId) ? studentId : null;
  return (
    <>
      <PageHead>
        <Cartouche>{t.studentChannel.title}</Cartouche>
      </PageHead>
      {list.isPending && <ListSkeleton />}
      {list.isError && <FormAlert>{t.studentChannel.loadFailed}</FormAlert>}
      {list.data?.length === 0 && (
        <EmptyState title={t.studentChannel.listEmpty}>{t.studentChannel.listEmptyHint}</EmptyState>
      )}
      {rows.length > 0 && (
        <div className="grid gap-4 shell:grid-cols-[280px_1fr]">
          <div className={picked ? 'max-shell:hidden' : undefined}>
            <TeacherChannelList rows={rows} selected={picked} onPick={onPick} />
          </div>
          <div className={picked ? undefined : 'max-shell:hidden'}>
            {picked ? (
              <div className="grid gap-3">
                <Button type="button" variant="ghost" size="sm" className="justify-self-start shell:hidden" onClick={() => onPick(null)}>
                  {t.studentChannel.back}
                </Button>
                <ChannelThread key={picked} refs={{ audience: 'teacher', studentId: picked }} tz={tz} named />
              </div>
            ) : (
              <p className="text-sm text-ink-3">{t.studentChannel.pick}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
