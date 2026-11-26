import { Button, EmptyState, NuqtaGlyph, t } from '@ab/web-kit';

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
export function ValuesLoadError({
  onRetry,
  message = v.loadError,
}: {
  onRetry: () => void;
  message?: string;
}) {
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
