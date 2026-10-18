import type { TemplateView, WaLine } from '@ab/shared';
import { Button } from '@/components/ui/button';
import { Ltr } from '@/components/ui/ltr';
import { t } from '@/lib/i18n';
import { canSubmit } from './api';

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

export interface RowActionsProps {
  tpl: TemplateView;
  onSubmit: (tpl: TemplateView) => void;
  onMove: (tpl: TemplateView) => void;
}

/**
 * Submit to Meta (a not-submitted / rejected / missing row, on either number; a PDF-header template too:
 * the API uploads a sample PDF first) and «نقل إلى الرقم الآخر», each behind its own dialog.
 */
export function RowActions({ tpl, onSubmit, onMove }: RowActionsProps) {
  return (
    <span className="flex flex-wrap gap-2">
      {canSubmit(tpl) && (
        <Button size="sm" variant="secondary" onClick={() => onSubmit(tpl)}>
          {t.templates.submit}
        </Button>
      )}
      <Button size="sm" variant="ghost" aria-label={t.templates.moveFor.replace('{name}', templateName(tpl.key))} onClick={() => onMove(tpl)}>
        {t.templates.move}
      </Button>
    </span>
  );
}
