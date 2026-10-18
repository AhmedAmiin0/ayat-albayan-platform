import type { TemplateLineView, TemplateView } from '@ab/shared';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Ltr } from '@/components/ui/ltr';
import { t } from '@/lib/i18n';
import { SubmitTarget } from './SubmitTarget';
import { templateName } from './template-cells';

const PARAM_NAMES: Record<string, string | undefined> = t.inbox.composer.paramNames;

export interface SubmitTemplateDialogProps {
  template: TemplateView;
  /** The number the row goes to Meta from: its formatted phone (lines check) and the server's facts. */
  phone: string | undefined;
  facts: TemplateLineView | undefined;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * The explicit confirm before a template goes to Meta for review (T3): the admin sees the exact
 * text, footer, variables and buttons that will be submitted, and the number (WABA) it goes to. Never automatic.
 */
export function SubmitTemplateDialog({ template: tpl, phone, facts, busy, onConfirm, onClose }: SubmitTemplateDialogProps) {
  const name = templateName(tpl.key);
  return (
    <Dialog
      title={t.templates.submit}
      glyph={{ tone: 'act', shape: 'hollow' }}
      description={t.templates.submitConfirm.replace('{name}', name)}
      onClose={onClose}
      layout="center"
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button disabled={busy} onClick={onConfirm}>
            {busy ? t.common.saving : t.templates.submitConfirmYes}
          </Button>
        </>
      }
    >
      <dl className="grid gap-3 text-sm">
        <SubmitTarget line={tpl.line} phone={phone} provider={facts?.provider} />
        <div className="grid gap-1">
          <dt className="text-xs font-semibold text-ink-3">{t.templates.body}</dt>
          <dd className="rounded-md bg-sunk px-3.5 py-2.5 whitespace-pre-wrap">{tpl.body_ar}</dd>
        </div>
        {tpl.footer_ar && (
          <div className="grid gap-1">
            <dt className="text-xs font-semibold text-ink-3">{t.templates.footer}</dt>
            <dd>{tpl.footer_ar}</dd>
          </div>
        )}
        <div className="grid gap-1">
          <dt className="text-xs font-semibold text-ink-3">{t.templates.params}</dt>
          <dd className="flex flex-wrap gap-x-4 gap-y-1">
            {tpl.params.length === 0 && '—'}
            {tpl.params.map((p, i) => (
              <span key={p}>
                <Ltr>{`{{${i + 1}}}`}</Ltr> {PARAM_NAMES[p] ?? p}
              </span>
            ))}
          </dd>
        </div>
        {tpl.buttons.length > 0 && (
          <div className="grid gap-1">
            <dt className="text-xs font-semibold text-ink-3">{t.templates.buttons}</dt>
            <dd className="flex flex-wrap gap-x-3 gap-y-1">
              {tpl.buttons.map((b) => (b.type === 'url' ? <Ltr key={b.url}>{b.url}</Ltr> : <span key={b.text}>{b.text}</span>))}
            </dd>
          </div>
        )}
        <div className="grid gap-1">
          <dt className="text-xs font-semibold text-ink-3">{t.templates.category}</dt>
          <dd>{t.enums.templateCategory[tpl.category]}</dd>
        </div>
      </dl>
    </Dialog>
  );
}
