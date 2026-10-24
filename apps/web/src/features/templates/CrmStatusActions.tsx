import type { TemplateView } from '@ab/shared';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import type { CrmTemplateStatus } from './api';
import { templateName } from './template-cells';

export interface CrmStatusActionsProps {
  tpl: TemplateView;
  /** This row's status is being saved: the buttons wait. */
  busy: boolean;
  onSet: (tpl: TemplateView, status: CrmTemplateStatus) => void;
}

/**
 * A crm line's template (docs/19): the CRM holds it, so the admin says by hand whether it is approved there.
 * Only the status the row does not have is offered. Marking it approved lets messages go out with it at
 * once, so that takes a second, explicit «تأكيد الاعتماد» (its consequence beside it; focus lands on the safe
 * «إلغاء», like SecretIntegrationRow). A fragment: the
 * buttons share RowActions' one wrapping row.
 */
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
