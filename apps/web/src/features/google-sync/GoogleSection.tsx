import { useQuery } from '@tanstack/react-query';
import { Toast } from '@/components/ui/overlay/toast';
import { t } from '@/lib/i18n';
import { ConnectionCard } from './ConnectionCard';
import { DriveCard } from './DriveCard';
import { BlockSkeleton, LoadError } from './GoogleBlock';
import { googleStatusQuery } from './google-api';
import { StudentMap } from './StudentMap';
import { SyncLog } from './SyncLog';
import { SyncSwitches } from './SyncSwitches';
import { TeacherMap } from './TeacherMap';
import { useOauthReturn } from './use-oauth-return';

const s = t.googleSync;

/**
 * «Google» under «التكاملات» (docs/24 §3 Web): the connected account, the two switches, the Drive
 * root, the teacher ↔ calendar and student ↔ folder mappings and the sync log. One way only,
 * platform → Google, default off and dry run. The client id / secret rows live in the form above.
 */
export function GoogleSection({ onNote }: { onNote: (message: string) => void }) {
  const status = useQuery(googleStatusQuery);
  const oauth = useOauthReturn();
  return (
    <div className="grid min-w-0 gap-4 border-t border-rule pt-4">
      <h3 className="text-base font-bold">
        {s.title}
      </h3>
      <p className="max-w-[70ch] text-xs text-ink-2">{s.intro}</p>
      {status.isPending && <BlockSkeleton rows={4} />}
      {status.isError && <LoadError message={s.loadError} onRetry={() => void status.refetch()} />}
      {status.data && (
        <>
          <ConnectionCard status={status.data} onNote={onNote} />
          <SyncSwitches status={status.data} onNote={onNote} />
          <DriveCard status={status.data} onNote={onNote} />
          <TeacherMap calendars={status.data.discovery?.calendars ?? []} onNote={onNote} />
          <StudentMap onNote={onNote} />
          <SyncLog status={status.data} onNote={onNote} />
        </>
      )}
      {oauth.note && <Toast message={oauth.note.message} tone={oauth.note.tone} onDismiss={oauth.clear} />}
    </div>
  );
}
