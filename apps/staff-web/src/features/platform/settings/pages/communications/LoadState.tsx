import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Skeleton } from '@/components/ui/display/skeleton';
import { t } from '@/lib/i18n/i18n';

const P = t.settingsPages;

/**
 * «التواصل» before the settings are in (D12): row-shaped bars marked aria-busy (no role=status, so
 * the page's one status stays its toast), or the load error inline with «أعد المحاولة».
 */
export function LoadState({ error, onRetry }: { error: boolean; onRetry: () => void }) {
  if (error) {
    return (
      <div className="grid justify-items-start gap-2">
        <FormAlert>{P.loadError}</FormAlert>
        <Button size="sm" variant="secondary" onClick={onRetry}>
          {P.retry}
        </Button>
      </div>
    );
  }
  return (
    <div aria-busy="true" className="grid gap-3 py-4">
      <span className="sr-only">{t.common.loading}</span>
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className={i % 2 ? 'w-2/3' : 'w-1/2'} />
      ))}
    </div>
  );
}
