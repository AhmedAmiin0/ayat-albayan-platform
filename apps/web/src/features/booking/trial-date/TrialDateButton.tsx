import { useId } from 'react';
import { Button } from '@/components/ui/form/button';
import { Icon } from '@/components/ui/display/icon';
import { t } from '@/lib/i18n';

export interface TrialDateButtonProps {
  /** canPickTrialDate(status) / history.allowed: no running subscription. */
  allowed: boolean;
  onOpen: () => void;
}

/**
 * «موعد تجريبي جديد» (owner 2026-10-25). A subscriber gets it disabled with the reason beside it
 * («هذا الطالب مشترك…»), so the admin knows to change the lesson days instead.
 */
export function TrialDateButton({ allowed, onOpen }: TrialDateButtonProps) {
  const reasonId = useId();
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        data-testid="trial-date-action"
        aria-haspopup="dialog"
        title={allowed ? t.trialDate.actionHint : undefined}
        disabled={!allowed}
        aria-describedby={allowed ? undefined : reasonId}
        onClick={onOpen}
      >
        <Icon name="calendar" />
        {t.trialDate.action}
      </Button>
      {!allowed && (
        <span id={reasonId} className="text-xs text-ink-3">
          {t.trialDate.notAllowed}
        </span>
      )}
    </span>
  );
}
