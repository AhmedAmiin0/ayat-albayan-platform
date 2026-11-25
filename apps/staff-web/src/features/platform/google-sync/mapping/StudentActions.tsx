import type { GoogleStudentMapInput, GoogleStudentMapRow } from '@ab/catalog';
import { Button, t } from '@ab/web-kit';

const s = t.googleSync.students;

interface Props {
  row: GoogleStudentMapRow;
  busy: boolean;
  manual: boolean;
  on: { send: (body: GoogleStudentMapInput) => void; unmap: () => void; toggle: () => void };
}

export function StudentActions({ row, busy, manual, on }: Props) {
  if (row.confirmed_at) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="danger-quiet" disabled={busy} onClick={on.unmap}>
          {s.unmap}
        </Button>
      </div>
    );
  }
  const hint = row.suggestion;
  return (
    <div className="flex flex-wrap gap-2">
      {hint && (
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => on.send({ folder_id: hint.folder_id, attendance_sheet_id: hint.attendance_sheet_id })}>
          {t.googleSync.common.confirm}
        </Button>
      )}
      <Button size="sm" variant="secondary" disabled={busy} onClick={() => on.send({ folder_id: null, attendance_sheet_id: null })}>
        {s.createNew}
      </Button>
      <Button size="sm" variant="ghost" aria-expanded={manual} onClick={on.toggle}>
        {s.manual}
      </Button>
    </div>
  );
}
