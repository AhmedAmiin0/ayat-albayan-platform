import type { ReactNode } from 'react';
import { t } from '@/lib/i18n';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';

export interface FilterPanelProps {
  onClose: () => void;
  /** «مسح الكل» in the footer, only while a filter is set. */
  onClearAll?: (() => void) | undefined;
  children: ReactNode;
}

/**
 * «تصفية»: every filter as a labelled field in the Dialog (an aside panel from 640px, a
 * full-screen sheet on phones). Changes apply at once (the URL / table update behind it);
 * «عرض النتائج» only closes.
 */
export function FilterPanel({ onClose, onClearAll, children }: FilterPanelProps) {
  return (
    <Dialog
      title={t.table.filter}
      onClose={onClose}
      actions={
        <>
          {onClearAll && (
            <Button type="button" variant="ghost" onClick={onClearAll}>
              {t.table.clearAll}
            </Button>
          )}
          <Button type="button" onClick={onClose}>
            {t.table.showResults}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">{children}</div>
    </Dialog>
  );
}
