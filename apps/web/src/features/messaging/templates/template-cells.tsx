import { templateStatusStyle, type TemplateLineView, type TemplateView, type WaLine } from '@ab/shared';
import { useId, type ReactNode } from 'react';
import { Button } from '@/components/ui/form/button';
import { Ltr } from '@/components/ui/display/ltr';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';
import { canSubmit } from './api';
import { crmCanSubmit, crmOnly } from './crm/crm-submit';

// Cells of the template health table that carry more than one value (template-columns.tsx).

const NAMES: Record<string, string | undefined> = t.templates.names;

export const templateName = (key: string): string => NAMES[key] ?? key;

/** Stacked rows (< 640px) drop the table head: each value keeps its label inline. */
export const Label = ({ text }: { text: string }) => <span className="text-ink-3 sm:hidden">{text}: </span>;

/** The Arabic name over the Meta name; a template imported from Meta shows its Meta name once, as an LTR island. */
export function NameCell({ name, tpl }: { name: string; tpl: TemplateView }) {
  if (name === tpl.meta_name) return <Ltr className="font-semibold text-ink">{name}</Ltr>;
  return (
    <span className="grid gap-0.5">
      <span className="font-semibold text-ink">{name}</span>
      <Ltr className="text-2xs text-ink-3">{tpl.meta_name}</Ltr>
    </span>
  );
}

/** «الرقم»: the line's name, then its formatted phone when a lines check has run. */
export function NumberCell({ line, phone }: { line: WaLine; phone: string | undefined }) {
  return (
    <span className="text-ink-2">
      <Label text={t.templates.number} />
      {t.enums.waLine[line]}
      {phone && (
        <Ltr className="block text-2xs text-ink-3 max-sm:inline max-sm:ms-1">{phone}</Ltr>
      )}
    </span>
  );
}

/**
 * The status chip and Meta's reason. A crm line's row (docs/39) reads its status from the CRM on
 * «مزامنة», or by hand as the fallback: «يدويًا / من CRM» beside the chip, and missing reads «غير متاح
 * في نظام CRM».
 */
export function StatusCell({ tpl, crm }: { tpl: TemplateView; crm: boolean }) {
  const label = crm && tpl.status === 'missing' ? t.templates.crmStatus.missingChip : t.enums.templateStatus[tpl.status];
  return (
    <span className="grid justify-items-start gap-1">
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <StatusChip size="sm" {...templateStatusStyle[tpl.status]} label={label} />
        {crm && <span className="text-2xs text-ink-3">{t.templates.crmStatus.note}</span>}
      </span>
      {tpl.last_error && <span className="max-w-[28ch] text-2xs whitespace-normal text-danger">{tpl.last_error}</span>}
    </span>
  );
}

export interface RowActionsProps {
  tpl: TemplateView;
  onSubmit: (tpl: TemplateView) => void;
  onMove: (tpl: TemplateView) => void;
  /** The server's facts for the number the row would move to; undefined while loading. */
  target: TemplateLineView | undefined;
  /**
   * Set only on a crm line's row (docs/39): its hand-set status buttons and CRM name, the fallback
   * when the CRM cannot say. Its submit goes through the CRM, where the CRM's API allows.
   */
  crm?: ReactNode;
  /** A meta line's «اسم القالب في واتساب» button, beside its submit (docs/19 «CRM → Meta»). */
  name?: ReactNode;
}

type SubmitProps = Pick<RowActionsProps, 'tpl' | 'onSubmit'> & { onCrm: boolean };

/**
 * «إرسال إلى ميتا» for a submittable row. On a crm line only when the API would submit it through
 * the CRM (crm-submit.ts); a document header, or a rejected row Meta already holds, says instead
 * that it is made in the CRM dashboard, and why.
 */
function SubmitAction({ tpl, onSubmit, onCrm }: SubmitProps) {
  const only = onCrm ? crmOnly(tpl) : null;
  const shown = (onCrm ? crmCanSubmit : canSubmit)(tpl);
  return (
    <>
      {shown && (
        <Button size="sm" variant="secondary" onClick={() => onSubmit(tpl)}>
          {t.templates.submit}
        </Button>
      )}
      {only && <span className="self-center text-2xs text-ink-3">{t.templates.crmSubmit[only]}</span>}
    </>
  );
}

/**
 * Submit to Meta (a not-submitted / rejected / missing row, on either number; a PDF-header template too
 * on meta: the API uploads a sample PDF first) and «نقل إلى الرقم الآخر», each behind its own dialog.
 * Moving to a number the server has no credentials for is disabled, with the reason beside it.
 */
export function RowActions({ tpl, onSubmit, onMove, target, crm, name }: RowActionsProps) {
  const reason = useId();
  const onCrm = crm !== undefined;
  const noTarget = target?.configured === false;
  return (
    <span className="flex flex-wrap gap-2">
      <SubmitAction tpl={tpl} onSubmit={onSubmit} onCrm={onCrm} />
      {crm}
      {name}
      <Button
        size="sm"
        variant="ghost"
        aria-label={t.templates.moveFor.replace('{name}', templateName(tpl.key))}
        aria-describedby={noTarget ? reason : undefined}
        disabled={noTarget}
        onClick={() => onMove(tpl)}
      >
        {t.templates.move}
      </Button>
      {noTarget && (
        <span id={reason} className="self-center text-2xs text-ink-3">
          {t.templates.moveUnavailable}
        </span>
      )}
    </span>
  );
}
