import type { ConfigEntry } from '@ab/shared';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import type { DescribeTarget } from './describe-target';
import { canEditDescription, editorStart, shownDescription, type DescribeRights } from './description';
import { DescriptionEditor } from './DescriptionEditor';

const d = t.settingsValues.describe;

export interface DescriptionDialogProps {
  target: DescribeTarget;
  entry: ConfigEntry | undefined;
  rights: DescribeRights;
  onClose: () => void;
  onDone: (message: string) => void;
}

/**
 * The row's description in full (docs/26b §2 «الاسم»): the editor for whoever may write it (settings.write,
 * or the owning module's right on an owned key), otherwise the text to read, and the developer key.
 */
export function DescriptionDialog({ target, entry, rights, onClose, onDone }: DescriptionDialogProps) {
  const input = { entry, hintKey: target.hintKey, locale, bundle: t };
  if (entry && canEditDescription(entry, rights)) {
    return <DescriptionEditor target={target} entry={entry} start={editorStart(input)} onClose={onClose} onDone={onDone} />;
  }
  const text = shownDescription(input);
  return (
    <Dialog
      layout="center"
      title={d.readTitle}
      glyph={{ tone: 'neutral', shape: 'hollow' }}
      description={target.label}
      onClose={onClose}
      actions={
        <Button type="button" variant="secondary" data-autofocus onClick={onClose}>
          {t.common.close}
        </Button>
      }
    >
      <div className="grid gap-3">
        <p className="text-base leading-relaxed text-ink sm:text-sm">{text ?? d.none}</p>
        {rights.can('settings.write') && <p className="text-xs text-ink-3">{d.readOnlyNote}</p>}
        <details className="text-xs text-ink-3">
          <summary className="min-h-11 cursor-pointer content-center sm:min-h-8">{t.settingsValues.sheet.dev}</summary>
          <bdi dir="ltr" className="font-mono">
            {target.key}
          </bdi>
        </details>
      </div>
    </Dialog>
  );
}
