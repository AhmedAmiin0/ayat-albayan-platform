import { roleActions } from '@ab/client-core';
import { formatPhone } from '@ab/shared';
import { FormAlert } from '@/components/ui/form/form-alert';
import { SearchInput } from '@/components/ui/form/search-input';
import { Dialog } from '@/components/ui/overlay/dialog';
import { t } from '@/lib/i18n/i18n';
import { DialogActions } from '@/features/people/students/people-edit/DialogActions';
import type { PeopleDialogProps } from '@/features/people/students/people-edit/dialog-props';
import { FamilyResults } from './FamilyResults';
import { NewFamilyFields } from './NewFamilyFields';
import { useAttach } from './use-attach';

const E = t.peopleEdit;

/**
 * «ربط بولي أمر آخر» (owner 2026-11-02): pick a family by name, number or a child's code, or type a
 * new guardian's number, then confirm. POST /people/students/:id/guardian moves the student only:
 * packages, lessons and payments stay with the student, the old family stays.
 */
export function AttachDialog({ view, onClose, onDone }: PeopleDialogProps) {
  const a = useAttach(view, onDone);
  const canMove = roleActions(view).canMove;
  const { guardian } = view;
  const current = E.currentFamily
    .replace('{name}', guardian.name)
    .replace('{phone}', formatPhone(guardian.phone_e164));
  const actions = (
    <DialogActions
      onCancel={onClose}
      label={E.confirm}
      disabled={!(canMove && a.ready)}
      onConfirm={a.submit}
    />
  );
  return (
    <Dialog title={E.attach} description={current} onClose={onClose} actions={actions}>
      <div className="grid gap-4">
        <SearchInput
          aria-label={E.search}
          placeholder={E.search}
          value={a.search}
          onChange={(e) => a.setSearch(e.target.value)}
        />
        {a.results && (
          <FamilyResults
            families={a.results}
            currentId={guardian.id}
            picked={a.choice?.id ?? null}
            onPick={a.pick}
          />
        )}
        <NewFamilyFields
          value={a.fresh}
          invalid={a.invalid}
          onChange={a.editFresh}
          onUse={a.takeFresh}
        />
        {!canMove && <FormAlert>{E.moveLogin}</FormAlert>}
        {a.confirmText && <p role="status">{a.confirmText}</p>}
        {a.move.errorText && <FormAlert>{a.move.errorText}</FormAlert>}
      </div>
    </Dialog>
  );
}
