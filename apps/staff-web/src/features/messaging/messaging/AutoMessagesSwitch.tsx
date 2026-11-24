import type { AcademySettings } from '@ab/settings';
import { useState } from 'react';
import { ConfirmSwitchDialog } from '@ab/web-kit/components/ui/overlay/ConfirmSwitchDialog';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { StatusChip } from '@ab/web-kit/components/ui/display/status-chip';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useGateSwitch } from './gate-api';

const s = t.templates.settings;

function chipOf(on: boolean, risky: boolean) {
  if (risky) return { tone: 'act', glyph: 'hollow' } as const;
  return on ? ({ tone: 'ok', glyph: 'fill' } as const) : ({ tone: 'neutral', glyph: 'struck' } as const);
}

/** The question before switching: turning ON says who is reached, OFF what stops (and what does not). */
const ask = (on: boolean) =>
  on
    ? { title: s.autoDisable, description: s.autoDisableConfirm, yes: s.autoDisableYes }
    : { title: s.autoEnable, description: s.autoEnableConfirm, yes: s.autoEnableYes };

/** OFF by default until the old Apps Script reminders stop (migration 162, docs/09 cut-over). */
export function AutoMessagesSwitch({ settings }: { settings: AcademySettings }) {
  const on = settings.auto_messages_enabled;
  // On before the cut-over is ticked: families may get the Apps Script reminder too (the admin's turn).
  const risky = on && !settings.crm_cutover_done;
  const chip = chipOf(on, risky);
  const [confirming, setConfirming] = useState(false);
  const save = useGateSwitch({ onSaved: () => setConfirming(false) });

  return (
    <div className="grid gap-3 border-t border-rule pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">{s.autoMessages}</span>
        <StatusChip {...chip} label={on ? s.autoOn : s.autoOff} />
        <Button
          size="sm"
          variant={on ? 'danger-quiet' : 'secondary'}
          disabled={save.isPending}
          onClick={() => {
            save.reset();
            setConfirming(true);
          }}
        >
          {on ? s.autoDisable : s.autoEnable}
        </Button>
      </div>
      {risky && <p className="border-s border-s-rule ps-3 text-xs font-semibold text-act">{s.autoCheckScript}</p>}
      <p className="text-xs text-ink-3">{s.autoMessagesHint}</p>
      {save.isError && !confirming && <FormAlert>{t.common.error}</FormAlert>}
      {confirming && (
        <ConfirmSwitchDialog
          {...ask(on)}
          onYes={() => save.mutate({ auto: !on })}
          onClose={() => setConfirming(false)}
          pending={save.isPending}
          failed={save.isError}
        />
      )}
    </div>
  );
}
