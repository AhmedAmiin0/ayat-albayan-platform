import { TEMPLATE_KEYS, type TemplateLineView, type TemplateView } from '@ab/shared';
import { Button, Dialog, t } from '@ab/web-kit';
import { otherLine } from '@/features/messaging/templates/api';
import { templateName } from '@/features/messaging/templates/template-cells';

const PRODUCERS: readonly string[] = TEMPLATE_KEYS;

export interface MoveLineDialogProps {
  template: TemplateView;
  /** The server's facts for the number it would move to; undefined while loading. */
  target: TemplateLineView | undefined;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** A number without server credentials cannot be re-checked on Meta, so no confirm is offered. */
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
