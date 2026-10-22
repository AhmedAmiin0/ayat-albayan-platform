import type { GoogleFound } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { t } from '@/lib/i18n';
import { BlockSkeleton, GoogleBlock, LoadError } from './GoogleBlock';
import { googleTeachersQuery } from './google-api';
import { TeacherRow } from './TeacherRow';

const s = t.googleSync.teachers;

interface Props {
  calendars: readonly GoogleFound[];
  onNote: (message: string) => void;
}

/** «المعلمون والتقاويم»: one row per active teacher; nothing is used until «تأكيد». */
export function TeacherMap({ calendars, onNote }: Props) {
  const list = useQuery(googleTeachersQuery);
  return (
    <GoogleBlock title={s.title} hint={s.hint}>
      {list.isPending && <BlockSkeleton />}
      {list.isError && <LoadError message={t.googleSync.loadError} onRetry={() => void list.refetch()} />}
      {list.data?.length === 0 && <p className="text-sm text-ink-3">{s.empty}</p>}
      {list.data && list.data.length > 0 && (
        <ul aria-label={s.title} className="grid divide-y divide-rule border-y border-rule">
          {list.data.map((row) => (
            <TeacherRow key={row.teacher_id} row={row} calendars={calendars} onNote={onNote} />
          ))}
        </ul>
      )}
    </GoogleBlock>
  );
}
