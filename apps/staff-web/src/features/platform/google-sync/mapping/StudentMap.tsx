import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { SearchInput } from '@/components/ui/form/search-input';
import { t } from '@/lib/i18n/i18n';
import { useDebounced } from '@/features/finance/pricing/use-debounced';
import { BlockSkeleton, GoogleBlock, LoadError } from '@/features/platform/google-sync/GoogleBlock';
import { googleStudentsQuery } from '@/features/platform/google-sync/google-api';
import { StudentRow } from './StudentRow';

const s = t.googleSync.students;

/** «الطلاب والمجلدات»: search (debounced, server side), then per student confirm / new folder / manual link. */
export function StudentMap({ onNote }: { onNote: (message: string) => void }) {
  const [text, setText] = useState('');
  const q = useDebounced(text.trim(), 300);
  const list = useQuery({ ...googleStudentsQuery(q), placeholderData: keepPreviousData });
  return (
    <GoogleBlock title={s.title} hint={s.hint}>
      <SearchInput aria-label={s.search} placeholder={s.search} value={text} onChange={(e) => setText(e.target.value)} />
      {list.isPending && <BlockSkeleton />}
      {list.isError && <LoadError message={t.googleSync.loadError} onRetry={() => void list.refetch()} />}
      {list.data?.length === 0 && <p className="text-sm text-ink-3">{s.empty}</p>}
      {list.data && list.data.length > 0 && (
        <ul aria-label={s.title} aria-busy={list.isFetching} className="grid divide-y divide-rule border-y border-rule">
          {list.data.map((row) => (
            <StudentRow key={row.student_id} row={row} onNote={onNote} />
          ))}
        </ul>
      )}
    </GoogleBlock>
  );
}
