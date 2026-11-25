import type { CorrectTo } from '@ab/schedule';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { ButtonRow } from '@ab/web-kit/components/ui/layout/button-row';
import { t } from '@ab/web-kit/lib/i18n/i18n';

interface CorrectAskProps {
  to: CorrectTo;
  busy: boolean;
  onConfirm: () => void;
  onBack: () => void;
}

/** A correction says whether the lesson counts from the package before it is saved. */
export function CorrectAsk({ to, busy, onConfirm, onBack }: CorrectAskProps) {
  const c = t.lessons.correct;
  return (
    <div className="grid gap-2">
      <p role="status" className="rounded-md bg-sunk px-3 py-2 text-sm">
        {`${c.ask.replace('{to}', c.to[to])} ${c.counts[to]}`}
      </p>
      <ButtonRow>
        <Button type="button" variant="ghost" onClick={onBack}>
          {t.common.back}
        </Button>
        <Button type="button" disabled={busy} onClick={onConfirm}>
          {c.confirm}
        </Button>
      </ButtonRow>
    </div>
  );
}
