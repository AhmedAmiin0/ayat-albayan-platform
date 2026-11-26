import { Button, FormAlert, Dialog, t } from '@ab/web-kit';

const D = t.shortLinks.detail;

interface RevokeDialogProps {
  onConfirm: () => void;
  onClose: () => void;
  pending: boolean;
  failure: string | null;
}

/** Revoking stops the link at once for everyone and it never runs again. */
export function RevokeDialog({ onConfirm, onClose, pending, failure }: RevokeDialogProps) {
  const actions = (
    <>
      <Button type="button" variant="secondary" onClick={onClose}>
        {t.shortLinks.form.cancel}
      </Button>
      <Button type="button" variant="danger" disabled={pending} onClick={onConfirm}>
        {D.revokeConfirm}
      </Button>
    </>
  );
  return (
    <Dialog
      compact
      title={D.revokeTitle}
      glyph={{ tone: 'bad', shape: 'struck' }}
      onClose={onClose}
      actions={actions}
    >
      <p className="text-sm text-ink-2">{D.revokeBody}</p>
      {failure && <FormAlert>{failure}</FormAlert>}
    </Dialog>
  );
}
