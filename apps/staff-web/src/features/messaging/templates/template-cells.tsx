import { templateStatusStyle, type TemplateLineView, type TemplateView } from '@ab/shared';
import type { WaLine } from '@ab/catalog';
import { useId, type ReactNode } from 'react';
import { Button, Ltr, StatusChip, t } from '@ab/web-kit';
import { canSubmit } from './api';
import { crmCanSubmit, crmOnly } from './crm/crm-submit';

// Cells of the template health table that carry more than one value (template-columns.tsx).

const NAMES: Record<string, string | undefined> = t.templates.names;

export const templateName = (key: string): string => NAMES[key] ?? key;

/** Stacked rows (< 640px) drop the table head: each value keeps its label inline. */
export const Label = ({ text }: { text: string }) => (
  <span className="text-ink-3 sm:hidden">{text}: </span>
);

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

export function NumberCell({ line, phone }: { line: WaLine; phone: string | undefined }) {
  return (
    <span className="text-ink-2">
      <Label text={t.templates.number} />
      {t.enums.waLine[line]}
      {phone && <Ltr className="block text-2xs text-ink-3 max-sm:inline max-sm:ms-1">{phone}</Ltr>}
    </span>
  );
}

/** A crm line's row reads its status from the CRM on sync, or by hand as fallback (docs/39). */
export function StatusCell({ tpl, crm }: { tpl: TemplateView; crm: boolean }) {
  const label =
    crm && tpl.status === 'missing'
      ? t.templates.crmStatus.missingChip
      : t.enums.templateStatus[tpl.status];
  return (
    <span className="grid justify-items-start gap-1">
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <StatusChip size="sm" {...templateStatusStyle[tpl.status]} label={label} />
        {crm && <span className="text-2xs text-ink-3">{t.templates.crmStatus.note}</span>}
      </span>
      {tpl.last_error && (
        <span className="max-w-[28ch] text-2xs whitespace-normal text-danger">
          {tpl.last_error}
        </span>
      )}
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
  /** docs/19. */
  name?: ReactNode;
  onEdit: (tpl: TemplateView) => void;
}

type SubmitProps = Pick<RowActionsProps, 'tpl' | 'onSubmit'> & { onCrm: boolean };

/** On a crm line only when the API would submit via the CRM (crm-submit.ts). */
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
      {only && (
        <span className="self-center text-2xs text-ink-3">{t.templates.crmSubmit[only]}</span>
      )}
    </>
  );
}

/** On meta lines a PDF-header template uploads a sample PDF first; moves need credentials. */
export function RowActions({ tpl, onSubmit, onMove, target, crm, name, onEdit }: RowActionsProps) {
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
        aria-label={t.templates.edit.openFor.replace('{name}', templateName(tpl.key))}
        onClick={() => onEdit(tpl)}
      >
        {t.templates.edit.open}
      </Button>
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
