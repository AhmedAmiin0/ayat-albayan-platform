import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { draftOf, emptyDraft } from './custom-form';
import { CustomEntryForm } from './CustomEntryForm';
import type { CustomValues } from './use-custom-values';

const c = t.config.custom;
const p = t.settingsValues.customPublic;

/**
 * «أضف قيمة» / «عدّل» in a dialog (the same validated form), the question before a value becomes
 * public («ستظهر هذه القيمة لأي زائر قبل تسجيل الدخول»), and the delete confirmation («نعم، احذفها»).
 */
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
            onSave={custom.submit}
            onCancel={custom.closeEdit}
          />
          {custom.save.isError && <FormAlert className="mt-3">{t.common.error}</FormAlert>}
        </Dialog>
      )}
      {custom.publicAsk && (
        <Dialog
          compact
          title={p.title}
          glyph={{ tone: 'neutral', shape: 'hollow' }}
          description={p.body}
          onClose={custom.cancelPublic}
          actions={
            <>
              <Button variant="secondary" data-autofocus onClick={custom.cancelPublic}>
                {t.common.cancel}
              </Button>
              <Button onClick={custom.confirmPublic}>{p.yes}</Button>
            </>
          }
        >
          {null}
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
