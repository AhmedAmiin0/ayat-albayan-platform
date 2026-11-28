import type { LineCheckView } from '@ab/shared';
import { WA_LINES } from '@ab/catalog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, Toast, t } from '@ab/web-kit';
import { checkLines, linesCheckQuery } from '@/features/messaging/messaging/api';
import { LineRow } from '@/features/messaging/messaging/lines/LineRow';

/** Nothing is fetched on mount; at rest the card has no status or alert role. */
export function LinesCard() {
  const s = t.templates.settings.lines;
  const queryClient = useQueryClient();
  const [failed, setFailed] = useState(false);
  // The last good answer stays (with its checked_at) while re-checking and after a failed re-check.
  const [last, setLast] = useState<LineCheckView[]>();
  const check = useMutation({
    mutationFn: checkLines,
    onMutate: () => setFailed(false),
    onSuccess: (views) => {
      setLast(views);
      // The template blocks show each line's formatted number from this answer.
      queryClient.setQueryData(linesCheckQuery.queryKey, views);
    },
    onError: () => setFailed(true),
  });
  const views = check.data ?? last;

  return (
    <div className="min-w-0">
      <div className="mb-1 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h3 className="text-sm font-bold">{s.title}</h3>
        {!views && <span className="text-xs text-ink-3">{s.notChecked}</span>}
        <Button variant="secondary" size="sm" className="ms-auto" disabled={check.isPending} onClick={() => check.mutate()}>
          {check.isPending ? s.checking : s.check}
        </Button>
      </div>
      <p className="mb-2 max-w-[70ch] text-xs text-ink-2">{s.intro}</p>
      {/* Announces a finished check; no role (settings specs: strict getByRole('status')). */}
      <div aria-live="polite" aria-busy={check.isPending}>
        {WA_LINES.map((line) => (
          <LineRow key={line} line={line} view={views?.find((v) => v.line === line) ?? null} />
        ))}
      </div>
      {failed && <Toast tone="error" message={s.checkFailed} onDismiss={() => setFailed(false)} />}
    </div>
  );
}
