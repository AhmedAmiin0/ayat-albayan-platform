import { TEMPLATE_KEYS, type TemplateView } from '@ab/shared';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { t } from '@/lib/i18n';
import { otherLine } from './api';
import { templateName } from './template-cells';

const PRODUCERS: readonly string[] = TEMPLATE_KEYS;

export interface MoveLineDialogProps {
  template: TemplateView;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * «نقل إلى الرقم الآخر» confirm (owner 2026-10-18): which number the template leaves and joins, and,
 * for a template the platform sends on its own (TEMPLATE_KEYS), that booking / reminder messages
 * will then go out from the other number.
 */
export function MoveLineDialog({ template: tpl, busy, onConfirm, onClose }: MoveLineDialogProps) {
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
          <Button disabled={busy} onClick={onConfirm}>
            {busy ? t.common.saving : t.templates.moveYes}
          </Button>
        </>
      }
    >
      {PRODUCERS.includes(tpl.key) && (
        <p role="note" data-tone="act" className="border-s border-s-rule ps-3 text-sm font-semibold text-act">
          {t.templates.moveProducerWarning}
        </p>
      )}
    </Dialog>
  );
}
