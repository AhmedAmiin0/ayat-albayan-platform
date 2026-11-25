import type { AcademySettings } from '@ab/settings';
import { useState } from 'react';
import { ConfirmSwitchDialog, Button, FormAlert, StatusChip, t } from '@ab/web-kit';
import { useGateSwitch } from '@/features/messaging/messaging/gate-api';

const h = t.communicationsHub;

/** The question before the change: marking it moved hides the warning, unmarking brings it back. */
const ask = (done: boolean) =>
  done
    ? { title: h.crmUnmarkTitle, description: h.crmUnmarkConfirm, yes: h.crmUnmarkYes }
    : { title: h.crmMarkTitle, description: h.crmMarkConfirm, yes: h.crmMarkYes };

/** Asks first both ways with cancel focused (docs/09 step 3, docs/26b §6a 1.2-1.3). */
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
