import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormAlert } from '@/components/ui/form-alert';
import { t } from '@/lib/i18n';
import { draftOf, emptyDraft } from './custom-form';
import { CustomEntryForm } from './CustomEntryForm';
import type { CustomValues } from './use-custom-values';

const c = t.config.custom;

/** «أضف قيمة» / «عدّل» in a dialog (the same validated form), and the delete confirmation («نعم، احذفها»). */
export function CustomDialogs({ custom }: { custom: CustomValues }) {
  const { editing, deleting } = custom;
  return (
    <>
      {editing && (
        <Dialog title={editing.mode === 'add' ? c.add : c.edit} description={c.hint} onClose={custom.closeEdit}>
          <CustomEntryForm
            initial={editing.mode === 'edit' ? draftOf(editing.entry) : emptyDraft()}
            editing={editing.mode === 'edit'}
            saving={custom.save.isPending}
            onSave={(input) => custom.save.mutate(input)}
            onCancel={custom.closeEdit}
          />
          {custom.save.isError && <FormAlert className="mt-3">{t.common.error}</FormAlert>}
        </Dialog>
      )}
      {deleting && (
        <Dialog
          compact
          title={c.delete}
          onClose={custom.closeDelete}
          actions={
            <>
              <Button variant="ghost" data-autofocus onClick={custom.closeDelete}>
                {t.common.cancel}
              </Button>
              <Button variant="danger" disabled={custom.remove.isPending} onClick={() => custom.remove.mutate(deleting.key)}>
                {c.deleteYes}
              </Button>
            </>
          }
        >
          <p>{c.deleteConfirm.replace('{key}', deleting.key)}</p>
          {custom.remove.isError && <FormAlert className="mt-3">{t.common.error}</FormAlert>}
        </Dialog>
      )}
    </>
  );
}
