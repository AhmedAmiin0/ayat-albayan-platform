import type { NumberView } from '@ab/shared';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { t } from '@/lib/i18n';
import { templateName } from './template-cells';
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

/**
 * «تغيير رقم الإرسال» confirm: the template must be approved on that number's WABA, or the message
 * goes out from the next number in order (docs/23c decision 3). Cancel keeps the old number;
 * Cancel / Escape wait while the save is in flight.
 */
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
