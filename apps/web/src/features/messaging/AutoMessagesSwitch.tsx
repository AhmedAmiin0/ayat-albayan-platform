import type { AcademySettings } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { StatusChip } from '@/components/ui/status-chip';
import { t } from '@/lib/i18n';
import { useSettingSwitch } from '@/lib/use-setting-switch';
import { ConfirmSwitchDialog } from './ConfirmSwitchDialog';

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

/**
 * settings.auto_messages_enabled (migration 162, docs/09 cut-over): the jobs' lesson reminders,
 * follow-ups and renewal reminders. OFF (the default) until the old Apps Script reminders stop;
 * the admin's own sends, booking confirmations and report_ready are not affected. The send gate
 * (MessagingSwitch) still decides whether anything leaves at all. Switched on while the cut-over
 * (crm_cutover_done) is not ticked, it reads as the admin's turn with «اتأكد إن تذكيرات … وقفت».
 * Both ways ask first and say who is reached or what stops (docs/23a §E H4).
 */
export function AutoMessagesSwitch({ settings }: { settings: AcademySettings }) {
  const on = settings.auto_messages_enabled;
  // On before the cut-over is ticked: families may get the Apps Script reminder too (the admin's turn).
  const risky = on && !settings.crm_cutover_done;
  const chip = chipOf(on, risky);
  const [confirming, setConfirming] = useState(false);
  const save = useSettingSwitch({ onSaved: () => setConfirming(false) });

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
          onYes={() => save.mutate({ autoMessagesEnabled: !on })}
          onClose={() => setConfirming(false)}
          pending={save.isPending}
          failed={save.isError}
        />
      )}
    </div>
  );
}
