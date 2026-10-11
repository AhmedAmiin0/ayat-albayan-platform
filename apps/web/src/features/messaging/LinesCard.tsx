import { WA_LINES } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Toast } from '@/components/ui/toast';
import { t } from '@/lib/i18n';
import { checkLines } from './api';
import { LineRow } from './LineRow';

/**
 * «خطوط واتساب» (docs/12 §13.10, R-MSG-05): the notifications and chat lines as Meta reports them.
 * Nothing is fetched on mount; «افحص الخطوط» asks the server now. A failed check is a Toast; at
 * rest the card has no role=status / role=alert (the settings page owns those).
 */
export function LinesCard() {
  const s = t.templates.settings.lines;
  const [failed, setFailed] = useState(false);
  const check = useMutation({
    mutationFn: checkLines,
    onMutate: () => setFailed(false),
    onError: () => setFailed(true),
  });
  const views = check.data;

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
      {WA_LINES.map((line) => (
        <LineRow key={line} line={line} view={views?.find((v) => v.line === line) ?? null} />
      ))}
      {failed && <Toast tone="error" message={s.checkFailed} onDismiss={() => setFailed(false)} />}
    </div>
  );
}
