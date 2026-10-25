import type { NotificationEntryView } from '@ab/shared';
import { useState } from 'react';
import { ConfirmSwitchDialog } from '@/components/settings/dialogs/ConfirmSwitchDialog';
import { t } from '@/lib/i18n';
import { failureText, fillText, isFamilyFacing, reachText } from '../rule-text';
import { useRules } from '../rules-context';
import type { RuleRowState } from '../use-rule-row';
import { EssentialOffDialog } from './EssentialOffDialog';
import { onOffWord, RuleSwitchInput } from './RuleSwitchInput';

const r = t.notificationRules;
type Asking = 'family-on' | 'family-off' | 'essential-off' | null;

/** What a switch press asks first: family ON says whom it reaches; essential OFF is typed; family OFF a plain dialog. */
export function askFor(entry: Pick<NotificationEntryView, 'audience' | 'essential'>, on: boolean): Asking {
  if (!on && entry.essential) return 'essential-off';
  if (!isFamilyFacing(entry)) return null;
  return on ? 'family-on' : 'family-off';
}

/**
 * «التشغيل»: locked rows say «لا يمكن إيقافه»; without notifications.manage (or a row that is not
 * editable) the state in words; else the switch, which saves at once after its confirmation.
 */
export function RuleSwitch({ entry, row }: { entry: NotificationEntryView; row: RuleRowState | null }) {
  const api = useRules();
  const [asking, setAsking] = useState<Asking>(null);
  const name = t.notificationCatalogue.entries[entry.key].name;
  if (entry.locked) return <span className="text-xs text-ink-2">{r.locked}</span>;
  if (!row) {
    const on = entry.rule ? entry.rule.enabled : entry.blocker !== 'row_off';
    return <span className="text-xs text-ink-2">{onOffWord(on)}</span>;
  }
  const close = () => setAsking(null);
  const change = (on: boolean) => {
    const ask = askFor(entry, on);
    if (ask) setAsking(ask);
    else row.setEnabled({ on });
  };
  const failed = row.failure !== null && row.failure !== 'confirmation_required';
  return (
    <>
      <RuleSwitchInput checked={row.rule.enabled} label={fillText(r.switchName, { name })} disabled={row.saving} onChange={change} />
      {asking === 'family-on' && (
        <ConfirmSwitchDialog
          title={fillText(r.familyOn.title, { name })}
          description={reachText(entry, api.reach)}
          yes={r.familyOn.yes}
          onYes={() => row.setEnabled({ on: true, onDone: close })}
          onClose={close}
          pending={row.saving}
          failed={failed}
        />
      )}
      {asking === 'family-off' && (
        <ConfirmSwitchDialog
          title={fillText(r.familyOff.title, { name })}
          description={r.familyOff.body}
          yes={r.familyOff.yes}
          onYes={() => row.setEnabled({ on: false, onDone: close })}
          onClose={close}
          pending={row.saving}
          failed={failed}
        />
      )}
      {asking === 'essential-off' && (
        <EssentialOffDialog
          name={name}
          pending={row.saving}
          error={row.failure ? failureText(row.failure) : null}
          onYes={(confirmText) => row.setEnabled({ on: false, confirmText, onDone: close })}
          onClose={close}
        />
      )}
    </>
  );
}
