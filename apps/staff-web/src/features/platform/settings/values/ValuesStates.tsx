import { Button } from '@ab/web-kit/components/ui/form/button';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { NuqtaGlyph } from '@ab/web-kit/components/ui/display/nuqta-glyph';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const v = t.settingsValues;

/** A search or filter with no match (docs/07 §10): the words and a clear-search button. */
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

/** An empty group shows one sentence, not a table of headers only. */
export function GroupEmpty() {
  return <EmptyState title={v.groupEmpty} />;
}

/** Settings could not load: an inline alert and retry; nothing is editable. */
export function ValuesLoadError({ onRetry, message = v.loadError }: { onRetry: () => void; message?: string }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md bg-danger-soft px-3 py-2.5 text-sm text-ink">
      <NuqtaGlyph shape="struck" className="text-danger" />
      <span>{message}</span>
      <Button size="sm" variant="secondary" onClick={onRetry}>
        {v.retry}
      </Button>
    </div>
  );
}
