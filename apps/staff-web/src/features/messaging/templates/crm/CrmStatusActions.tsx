import type { TemplateView } from '@ab/shared';
import { useId, useState } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { CrmTemplateStatus } from '@/features/messaging/templates/api';
import { templateName } from '@/features/messaging/templates/template-cells';

export interface CrmStatusActionsProps {
  tpl: TemplateView;
  /** This row's status is being saved: the buttons wait. */
  busy: boolean;
  onSet: (tpl: TemplateView, status: CrmTemplateStatus) => void;
}

/** Approving lets messages go out at once, so it needs a second explicit confirm (docs/19). */
export function CrmStatusActions({ tpl, busy, onSet }: CrmStatusActionsProps) {
  const s = t.templates.crmStatus;
  const name = templateName(tpl.key);
  const hint = useId();
  const [confirming, setConfirming] = useState(false);
  // The row stays mounted after the save (same key): close the confirm so the other action comes back.
  const approve = () => {
    setConfirming(false);
    onSet(tpl, 'approved');
  };
  if (confirming) {
    return (
      <>
        <Button size="sm" aria-label={s.confirmFor.replace('{name}', name)} aria-describedby={hint} disabled={busy} onClick={approve}>
          {s.confirm}
        </Button>
        <Button size="sm" variant="ghost" autoFocus disabled={busy} onClick={() => setConfirming(false)}>
          {t.common.cancel}
        </Button>
        <span id={hint} className="self-center text-2xs text-ink-3">
          {s.confirmHint}
        </span>
      </>
    );
  }
  return (
    <>
      {tpl.status !== 'approved' && (
        <Button size="sm" variant="secondary" aria-label={s.approvedFor.replace('{name}', name)} disabled={busy} onClick={() => setConfirming(true)}>
          {s.approved}
        </Button>
      )}
      {tpl.status !== 'missing' && (
        <Button size="sm" variant="ghost" aria-label={s.missingFor.replace('{name}', name)} disabled={busy} onClick={() => onSet(tpl, 'missing')}>
          {s.missing}
        </Button>
      )}
    </>
  );
}
