import type { ReactNode } from 'react';
import { t } from '@/lib/i18n';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
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
  return (
    <Dialog
      title={t.table.filter}
      onClose={onClose}
      hint={<FilterSummary visible count={count} resultCount={resultCount} />}
      actions={
        <>
          {onClearAll && (
            <Button type="button" variant="ghost" onClick={onClearAll}>
              {t.table.clearAll}
            </Button>
          )}
          <Button type="button" onClick={onClose}>
            {resultCount === undefined ? t.table.showResults : t.table.showResultsCount.replace('{n}', String(resultCount))}
          </Button>
        </>
      }
    >
      <div className="grid gap-5">{children}</div>
    </Dialog>
  );
}
