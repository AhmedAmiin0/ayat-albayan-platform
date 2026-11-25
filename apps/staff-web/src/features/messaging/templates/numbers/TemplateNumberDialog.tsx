import type { NumberView } from '@ab/shared';
import { Button, Dialog, t } from '@ab/web-kit';
import { templateName } from '@/features/messaging/templates/template-cells';
import type { NumberPick } from './use-template-number';

const s = t.templates.sendFrom;
/** While the save is in flight Escape and ✕ do nothing: the dialog closes when it settles. */
const noop = () => undefined;

export interface TemplateNumberDialogProps {
  /** The template and the number picked (null = the role's default). */
  pick: NumberPick;
  /** GET /admin/numbers, to name the number. */
  numbers: readonly NumberView[] | undefined;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Unapproved on that WABA, the message goes from the next number (docs/23c decision 3). */
export function TemplateNumberDialog({ pick, numbers, busy, onConfirm, onClose }: TemplateNumberDialogProps) {
  const name = templateName(pick.template.key);
  const number = pick.numberId === null ? undefined : numbers?.find((n) => n.id === pick.numberId);
  const text = number
    ? s.confirmText.replace('{name}', name).replace('{number}', number.label)
    : s.confirmDefault.replace('{name}', name);
  return (
    <Dialog
      title={s.confirmTitle}
      glyph={{ tone: 'act', shape: 'hollow' }}
      description={text}
      onClose={busy ? noop : onClose}
      compact
      actions={
        <>
          <Button variant="ghost" data-autofocus disabled={busy} onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button disabled={busy} onClick={onConfirm}>
            {busy ? t.common.saving : s.confirmYes}
          </Button>
        </>
      }
    >
      {null}
    </Dialog>
  );
}
