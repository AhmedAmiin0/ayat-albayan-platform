import { roleActions } from '@ab/client-core';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Dialog } from '@/components/ui/overlay/dialog';
import { t } from '@/lib/i18n/i18n';
import { DialogActions } from '@/features/people/students/people-edit/DialogActions';
import type { PeopleDialogProps } from '@/features/people/students/people-edit/dialog-props';
import { ConvertRow } from './ConvertRow';
import { SelfToggle } from './SelfToggle';
import { useConvert } from './use-convert';

const E = t.peopleEdit;

/**
 * «تحويل إلى طالب / ولي أمر» (owner 2026-11-02, people.switch_role): «الطالب هو ولي الأمر», the
 * guardian who is the learner as a student of their family, and a student row that is really the
 * parent as the family's guardian (only without any history or login). Each behind a confirm.
 */
export function ConvertDialog({ view, onClose, onDone }: PeopleDialogProps) {
  const can = roleActions(view);
  const c = useConvert(view, onDone);
  const actions = c.confirm ? (
    <DialogActions
      onCancel={() => c.ask(null)}
      label={E.confirm}
      disabled={c.busy}
      onConfirm={c.confirm.run}
    />
  ) : (
    <Button type="button" variant="ghost" onClick={onClose}>
      {E.close}
    </Button>
  );
  return (
    <Dialog title={E.convert} onClose={onClose} actions={actions}>
      <div className="grid gap-5">
        <SelfToggle
          on={can.selfOn}
          locked={!can.selfOn && !can.canSetSelf}
          busy={c.self.isPending}
          onToggle={(value) => c.self.mutate({ studentId: view.student.id, value })}
        />
        <ConvertRow
          hint={E.toStudentHint}
          label={E.toStudent}
          allowed={can.canGuardianToStudent}
          onAsk={() => c.ask('toStudent')}
        />
        <ConvertRow
          hint={can.canStudentToGuardian ? E.toGuardianHint : E.toGuardianLogin}
          label={E.toGuardian}
          allowed={can.canStudentToGuardian}
          onAsk={() => c.ask('toGuardian')}
        />
        {c.confirm && <p role="alert">{c.confirm.text}</p>}
        {c.error && <FormAlert>{c.error}</FormAlert>}
      </div>
    </Dialog>
  );
}
