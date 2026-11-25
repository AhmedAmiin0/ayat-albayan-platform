import type { GoogleStudentMapInput } from '@ab/catalog';
import { useState } from 'react';
import { Button, Field, Input, t } from '@ab/web-kit';
import { parseManualLink } from '@/features/platform/google-sync/google-input';

const s = t.googleSync.students;

interface Props {
  busy: boolean;
  onSubmit: (body: GoogleStudentMapInput) => void;
  onCancel: () => void;
}

/** Only ids are sent. */
export function StudentManualLink({ busy, onSubmit, onCancel }: Props) {
  const [folder, setFolder] = useState('');
  const [sheet, setSheet] = useState('');
  const [error, setError] = useState<'folder' | 'sheet' | null>(null);
  const submit = () => {
    const parsed = parseManualLink({ folder, sheet });
    setError(parsed.ok ? null : parsed.error);
    if (parsed.ok) onSubmit(parsed.body);
  };
  return (
    <div className="grid gap-3 rounded-md border border-rule bg-sunk px-3 py-3">
      <Field label={s.folderLink} {...(error === 'folder' ? { error: s.badLink } : {})}>
        {(p) => <Input {...p} dir="ltr" type="url" value={folder} onChange={(e) => setFolder(e.target.value)} />}
      </Field>
      <Field label={s.sheetLink} {...(error === 'sheet' ? { error: s.badSheetLink } : {})}>
        {(p) => <Input {...p} dir="ltr" type="url" value={sheet} onChange={(e) => setSheet(e.target.value)} />}
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" disabled={busy} onClick={submit}>
          {s.useLink}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {t.googleSync.confirm.cancel}
        </Button>
      </div>
    </div>
  );
}
