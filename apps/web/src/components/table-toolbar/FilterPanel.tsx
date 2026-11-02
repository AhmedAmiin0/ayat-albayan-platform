import { useRef, type ReactNode } from 'react';
import { t } from '@/lib/i18n/i18n';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { FilterSummary } from './FilterSummary';

export interface FilterPanelProps {
  onClose: () => void;
  /** «مسح الكل» in the footer, only while a filter is set. */
  onClearAll?: (() => void) | undefined;
  /** How many filters are set, and the rows they leave (when the page knows): «عرض النتائج (14)». */
  count?: number;
  resultCount?: number | undefined;
  children: ReactNode;
}

/**
 * «تصفية»: every filter as a labelled field in the Dialog (an aside panel from 640px, a
 * full-screen sheet on phones: title bar on top, body scrolling, the footer pinned above the home
 * indicator). Changes apply at once (the URL / table update behind it); the primary button names
 * how many rows they leave and only closes.
 */
export function FilterPanel({ onClose, onClearAll, count = 0, resultCount, children }: FilterPanelProps) {
  const primary = useRef<HTMLButtonElement>(null);
  // «مسح الكل» leaves with the last filter: focus moves to the primary button first, not to the page behind the dialog.
  const clear = () => {
    primary.current?.focus();
    onClearAll?.();
  };
  return (
    <Dialog
      title={t.table.filter}
      onClose={onClose}
      // A visible note only while a filter is set (an empty hint collapses on phones); the toolbar's own
      // summary stays the one live region, so changes made in here are announced once.
      hint={count > 0 ? <FilterSummary visible live={false} count={count} resultCount={resultCount} /> : undefined}
      actions={
        <>
          {onClearAll && (
            <Button type="button" variant="ghost" onClick={clear}>
              {t.table.clearAll}
            </Button>
          )}
          <Button ref={primary} type="button" onClick={onClose}>
            {resultCount === undefined ? t.table.showResults : t.table.showResultsCount.replace('{n}', String(resultCount))}
          </Button>
        </>
      }
    >
      <div className="grid gap-5">{children}</div>
    </Dialog>
  );
}
