import { allowedPeopleActions, type PeopleActionKind } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { useState, type ComponentType } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { usePermissions } from '@/features/people/auth';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { peopleEditQuery } from './api';
import { AttachDialog } from './attach/AttachDialog';
import { ConvertDialog } from './convert/ConvertDialog';
import type { PeopleDialogProps } from './dialog-props';
import { EditDataDialog } from './edit/EditDataDialog';

const E = t.peopleEdit;

/** Each action's label and dialog; which ones a role sees: @ab/client-core allowedPeopleActions. */
const DIALOGS: Record<
  PeopleActionKind,
  { label: string; Dialog: ComponentType<PeopleDialogProps> }
> = {
  edit: { label: E.editData, Dialog: EditDataDialog },
  attach: { label: E.attach, Dialog: AttachDialog },
  convert: { label: E.convert, Dialog: ConvertDialog },
};

export interface PeopleEditActionsProps {
  studentId: string;
  /** Converting to a guardian removed the student row, so the page leaves it. */
  onRemoved?: (notice: string) => void;
}

/** Only the actions the role holds are shown. */
export function PeopleEditActions({ studentId, onRemoved }: PeopleEditActionsProps) {
  const { can } = usePermissions();
  const [open, setOpen] = useState<PeopleActionKind | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const view = useQuery({ ...peopleEditQuery(studentId), enabled: open !== null });
  const allowed = allowedPeopleActions(can);
  if (allowed.length === 0) return null;
  const active = open ? DIALOGS[open] : null;
  const done = (text: string, removed = false) => {
    setOpen(null);
    setNotice(text);
    (removed ? onRemoved : undefined)?.(text);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {allowed.map((kind) => (
        <Button
          key={kind}
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setOpen(kind)}
        >
          {DIALOGS[kind].label}
        </Button>
      ))}
      {active && view.data && (
        <active.Dialog view={view.data} onClose={() => setOpen(null)} onDone={done} />
      )}
      {active && view.isError && <FormAlert>{E.errors.generic}</FormAlert>}
      {notice && (
        <p role="status" className="text-sm text-ink-2">
          {notice}
        </p>
      )}
    </div>
  );
}
