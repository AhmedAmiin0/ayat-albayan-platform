import type { AcademySettings } from '@ab/shared';
import { useState } from 'react';
import { ConfirmSwitchDialog } from '@/components/settings/ConfirmSwitchDialog';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { StatusChip } from '@/components/ui/status-chip';
import { useGateSwitch } from '@/features/messaging/gate-api';
import { t } from '@/lib/i18n';

const h = t.communicationsHub;

/** The question before the change: marking it moved hides the warning, unmarking brings it back. */
const ask = (done: boolean) =>
  done
    ? { title: h.crmUnmarkTitle, description: h.crmUnmarkConfirm, yes: h.crmUnmarkYes }
    : { title: h.crmMarkTitle, description: h.crmMarkConfirm, yes: h.crmMarkYes };

/**
 * «نقل الرقم من نظام CRM» (crm_cutover_done, docs/09 step 3; docs/26b §6a 1.2–1.3): the state in a
 * line and one button, which asks first both ways (cancel focused) and then writes through PUT
 * /messages/gate/cutover. The warning on «نظرة عامة» and in the sending confirmation follows it.
 */
export function CrmCutoverCard({ settings }: { settings: AcademySettings }) {
  const done = settings.crm_cutover_done;
  const [asking, setAsking] = useState(false);
  const save = useGateSwitch({ onSaved: () => setAsking(false) });
  return (
    <section aria-labelledby="crm-cutover-title" className="grid justify-items-start gap-2">
      <h2 id="crm-cutover-title" className="text-h4 font-bold">
        {h.crmTitle}
      </h2>
      {/* The chip changes after a save: said politely (no role=status, the page's toast has it). */}
      <div aria-live="polite" data-testid="crm-state">
        <StatusChip tone={done ? 'ok' : 'act'} glyph={done ? 'fill' : 'hollow'} label={done ? h.crmDoneState : h.crmPendingState} />
      </div>
      <Button
        size="sm"
        variant={done ? 'ghost' : 'secondary'}
        disabled={save.isPending}
        onClick={() => {
          save.reset(); // an earlier failure must not greet the new question
          setAsking(true);
        }}
      >
        {done ? h.crmUnmark : h.crmMark}
      </Button>
      {save.isError && !asking && <FormAlert>{t.common.error}</FormAlert>}
      {asking && (
        <ConfirmSwitchDialog
          {...ask(done)}
          onYes={() => save.mutate({ cutover: !done })}
          onClose={() => setAsking(false)}
          pending={save.isPending}
          failed={save.isError}
        />
      )}
    </section>
  );
}
