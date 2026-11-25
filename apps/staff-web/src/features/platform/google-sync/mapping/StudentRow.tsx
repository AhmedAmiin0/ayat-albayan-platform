import type { GoogleStudentMapInput, GoogleStudentMapRow } from '@ab/catalog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { FormAlert, Ltr, StatusChip, t } from '@ab/web-kit';
import { deleteStudentFolder, putStudentFolder } from '@/features/platform/google-sync/google-api';
import { fill } from '@/features/platform/google-sync/google-format';
import { StudentActions } from './StudentActions';
import { StudentManualLink } from './StudentManualLink';
import { googleKeys } from '@/features/platform/keys';

const s = t.googleSync.students;

function RowState({ row }: { row: GoogleStudentMapRow }) {
  if (!row.confirmed_at) return <StatusChip size="sm" tone="neutral" glyph="hollow" label={s.unmapped} />;
  return <StatusChip size="sm" tone="ok" glyph="fill" label={row.create_new ? s.createNew : s.existing} />;
}

export function StudentRow({ row, onNote }: { row: GoogleStudentMapRow; onNote: (message: string) => void }) {
  const queryClient = useQueryClient();
  const [manual, setManual] = useState(false);
  const done = async () => {
    setManual(false);
    onNote(t.googleSync.common.saved);
    const refreshed = [googleKeys.students(), googleKeys.status(), googleKeys.items()];
    await Promise.all(refreshed.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  };
  const put = useMutation({ mutationFn: putStudentFolder, onSuccess: done });
  const unmap = useMutation({ mutationFn: deleteStudentFolder, onSuccess: done });
  const send = (body: GoogleStudentMapInput) => put.mutate({ studentId: row.student_id, body });
  const busy = put.isPending || unmap.isPending;
  return (
    <li className="grid gap-2 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <p className="min-w-0 text-sm font-semibold break-words">{row.name}</p>
        <Ltr className="text-xs text-ink-3">{row.code}</Ltr>
        <RowState row={row} />
      </div>
      {!row.confirmed_at && row.suggestion && <p className="text-xs text-ink-3 break-words">{fill(s.suggested, { name: row.suggestion.name })}</p>}
      <StudentActions row={row} busy={busy} manual={manual} on={{ send, unmap: () => unmap.mutate(row.student_id), toggle: () => setManual((v) => !v) }} />
      {manual && <StudentManualLink busy={busy} onSubmit={send} onCancel={() => setManual(false)} />}
      {(put.isError || unmap.isError) && <FormAlert>{t.googleSync.common.saveError}</FormAlert>}
    </li>
  );
}
