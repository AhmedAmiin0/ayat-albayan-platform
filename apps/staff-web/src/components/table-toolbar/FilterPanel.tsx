import { useRef, type ReactNode } from 'react';
import { t, Button, Dialog } from '@ab/web-kit';
import { FilterSummary } from './FilterSummary';

export interface FilterPanelProps {
  onClose: () => void;
  /** Only while a filter is set. */
  onClearAll?: (() => void) | undefined;
  count?: number;
  resultCount?: number | undefined;
  children: ReactNode;
}

/** Changes apply at once; the primary button only closes and names how many rows remain. */
export function FilterPanel({
  onClose,
  onClearAll,
  count = 0,
  resultCount,
  children,
}: FilterPanelProps) {
  const primary = useRef<HTMLButtonElement>(null);
  // Clearing removes the last filter, so focus moves to the primary button, not behind the dialog.
  const clear = () => {
    primary.current?.focus();
    onClearAll?.();
  };
  return (
    <Dialog
      title={t.table.filter}
      onClose={onClose}
      // A visible note only while a filter is set (an empty hint collapses on phones); the
      // toolbar's summary stays the one live region, so changes made here are announced once.
      hint={
        count > 0 ? (
          <FilterSummary visible live={false} count={count} resultCount={resultCount} />
        ) : undefined
      }
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
