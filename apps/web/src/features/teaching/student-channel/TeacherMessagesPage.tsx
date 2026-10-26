import { useQuery } from '@tanstack/react-query';
import { Cartouche } from '@/components/ui/display/cartouche';
import { EmptyState } from '@/components/ui/display/empty-state';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { PageHead } from '@/components/ui/layout/page';
import { viewerTz } from '@/features/teaching/classroom';
import { t } from '@/lib/i18n/i18n';
import { teacherChannelsQuery } from './api';
import { ChannelThread } from './ChannelThread';
import { TeacherChannelList } from './TeacherChannelList';

interface Props {
  /** ?student= (a push opens it); null = the list only on a phone, the first prompt on a wide screen. */
  studentId: string | null;
  onPick: (studentId: string | null) => void;
}

/**
 * /teacher/messages «رسائل الطلاب» (docs/31 §2): the channels with the families of my current students. On
 * a phone the list and the thread take turns («كل الطلاب» goes back); from 900px they sit side by side.
 */
export function TeacherMessagesPage({ studentId, onPick }: Props) {
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
      {list.data?.length === 0 && <EmptyState title={t.studentChannel.listEmpty}>{t.studentChannel.listEmptyHint}</EmptyState>}
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
                <ChannelThread key={picked} refs={{ audience: 'teacher', studentId: picked }} tz={viewerTz()} />
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
