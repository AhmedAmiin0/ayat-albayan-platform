import { useId } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { t } from '@ab/web-kit/lib/i18n/i18n';

export interface TrialDateButtonProps {
  /** canPickTrialDate(status) / history.allowed: no running subscription. */
  allowed: boolean;
  onOpen: () => void;
}

/** A subscriber gets it disabled with the reason, so the admin changes the lesson days instead. */
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
