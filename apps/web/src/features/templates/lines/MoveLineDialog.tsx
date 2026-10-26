import { TEMPLATE_KEYS, type TemplateLineView, type TemplateView } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { t } from '@/lib/i18n/i18n';
import { otherLine } from '../api';
import { templateName } from '../template-cells';

const PRODUCERS: readonly string[] = TEMPLATE_KEYS;

export interface MoveLineDialogProps {
  template: TemplateView;
  /** The server's facts for the number it would move to; undefined while loading. */
  target: TemplateLineView | undefined;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * «نقل إلى الرقم الآخر» confirm (owner 2026-10-18): which number the template leaves and joins, and,
 * for a template the platform sends on its own (TEMPLATE_KEYS), that booking / reminder messages
 * will then go out from the other number. A number the server has no credentials for cannot be
 * re-checked on Meta, so it says so and offers no confirm.
 */
export function MoveLineDialog({ template: tpl, target, busy, onConfirm, onClose }: MoveLineDialogProps) {
  const noTarget = target?.configured === false;
  const from = t.enums.waLine[tpl.line];
  const to = t.enums.waLine[otherLine(tpl.line)];
  const text = t.templates.moveConfirm.replace('{name}', templateName(tpl.key)).replaceAll('{from}', from).replaceAll('{to}', to);
  return (
    <Dialog
      title={t.templates.moveTitle}
      glyph={{ tone: 'act', shape: 'hollow' }}
      description={text}
      onClose={onClose}
      compact
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button disabled={busy || noTarget} onClick={onConfirm}>
            {busy ? t.common.saving : t.templates.moveYes}
          </Button>
        </>
      }
    >
      {noTarget && (
        <p role="alert" className="border-s border-s-rule ps-3 text-sm font-semibold text-danger">
          {t.templates.moveUnavailable}
        </p>
      )}
      {PRODUCERS.includes(tpl.key) && (
        <p role="note" data-tone="act" className="border-s border-s-rule ps-3 text-sm font-semibold text-act">
          {t.templates.moveProducerWarning}
        </p>
      )}
    </Dialog>
  );
}
