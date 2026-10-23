import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { t } from '@/lib/i18n';

const v = t.settingsValues;

/** A search or filter that finds nothing (docs/07 §10): the words, and «امسح البحث» back to the group. */
export function ValuesEmpty({ onClear }: { onClear: () => void }) {
  return (
    <EmptyState
      title={v.empty}
      action={
        <Button variant="secondary" onClick={onClear}>
          {v.clearSearch}
        </Button>
      }
    >
      {v.emptyHint}
    </EmptyState>
  );
}

/** The settings could not load: an inline alert and «أعد المحاولة»; nothing is editable. */
export function ValuesLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-ink">
      <NuqtaGlyph shape="struck" className="text-danger" />
      <span>{v.loadError}</span>
      <Button size="sm" variant="secondary" onClick={onRetry}>
        {v.retry}
      </Button>
    </div>
  );
}
