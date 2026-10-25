import { counted, westernDigits, type SettingKey } from '@ab/shared';
import { useId, useState } from 'react';
import { ConfirmSwitchDialog } from '@/components/settings/ConfirmSwitchDialog';
import { settingText } from '@/components/settings/setting-text';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { Input } from '@/components/ui/form/input';
import { t } from '@/lib/i18n';
import type { PendingConfirm } from './use-values-controller';

const v = t.settingsValues;
const c = v.confirm;

/** The typed number matches the days, typed on any keypad («٣٠» is 30). */
export const typedMatches = (typed: string, days: number): boolean => westernDigits(typed) === String(days);

/** «حذف البيانات الأقدم من 3 أيام؟» (the counted form, never «3 يومًا»). */
export const typedTitle = (days: number): string => c.typedTitleCount.replace('{count}', counted(v.units.days, days));

const YES: Partial<Record<SettingKey, { on: string; off: string }>> = {
  teachers_always_available: v.confirmYes.teachersAlwaysAvailable,
  meeting_link_auto: v.confirmYes.meetingLinkAuto,
  sales_auto_assign: v.confirmYes.salesAutoAssign,
};

/** The yes button says what it does to that switch («أتِح كل المعلمين للحجز» / «أوقف…»). */
export function plainYes(key: SettingKey, value: unknown): string {
  const words = YES[key];
  if (!words || typeof value !== 'boolean') return c.plainYes;
  return value ? words.on : words.off;
}

export interface ConfirmValueDialogProps {
  pending: PendingConfirm;
  /** Yes; a typed confirmation passes the typed text (the server checks it again, 428). */
  onYes: (confirmText?: string) => void;
  onClose: () => void;
}

function TypedDialog({ pending, onYes, onClose }: ConfirmValueDialogProps) {
  const id = useId();
  const [typed, setTyped] = useState('');
  const days = Number(pending.value);
  const words = settingText(pending.key);
  const ok = typedMatches(typed, days);
  return (
    <Dialog
      compact
      title={typedTitle(days)}
      glyph={{ tone: 'bad', shape: 'struck' }}
      description={c.typedBody}
      onClose={onClose}
      hint={c.logged}
      actions={
        <>
          <Button variant="secondary" data-autofocus onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button variant="danger" aria-disabled={!ok || undefined} onClick={() => ok && onYes(typed.trim())}>
            {c.typedYes}
          </Button>
        </>
      }
    >
      {(words.toggleHint ?? words.hint) && <p className="mb-3 text-sm text-ink-2">{words.toggleHint ?? words.hint}</p>}
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {c.typedLabel.replace('{n}', String(days))}
      </label>
      <Input id={id} dir="ltr" inputMode="numeric" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} className="max-w-40" />
    </Dialog>
  );
}

/**
 * The registry's confirmation before a row saves (VALUE_CONFIRM): a plain dialog for the
 * booking-wide switches (their hint is the impact), typed for retention days that delete data.
 * «إلغاء» is the default focus.
 */
export function ConfirmValueDialog({ pending, onYes, onClose }: ConfirmValueDialogProps) {
  if (pending.kind === 'typed') return <TypedDialog pending={pending} onYes={onYes} onClose={onClose} />;
  const words = settingText(pending.key);
  return (
    <ConfirmSwitchDialog
      title={c.plainTitle.replace('{name}', words.label)}
      description={words.hint ?? c.logged}
      yes={plainYes(pending.key, pending.value)}
      onYes={() => onYes()}
      onClose={onClose}
      pending={false}
      failed={false}
    >
      <p className="text-xs text-ink-3">{c.logged}</p>
    </ConfirmSwitchDialog>
  );
}
