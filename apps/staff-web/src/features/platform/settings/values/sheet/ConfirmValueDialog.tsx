import { counted } from '@ab/core';
import { westernDigits } from '@ab/money';
import type { SettingKey } from '@ab/settings';
import { useId, useState } from 'react';
import { ConfirmSwitchDialog } from '@ab/web-kit/components/ui/overlay/ConfirmSwitchDialog';
import { settingText } from '@/components/settings/search/setting-text';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Dialog } from '@ab/web-kit/components/ui/overlay/dialog';
import { Input } from '@ab/web-kit/components/ui/form/input';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { PendingConfirm } from '@/features/platform/settings/values/hooks/use-values-controller.types';

const v = t.settingsValues;
const c = v.confirm;

/** The typed number matches the days on any keypad, so Arabic-Indic digits count too. */
export const typedMatches = (typed: string, days: number): boolean => westernDigits(typed) === String(days);

/** Uses the counted plural form of days. */
export const typedTitle = (days: number): string => c.typedTitleCount.replace('{count}', counted(v.units.days, days));

const YES: Partial<Record<SettingKey, { on: string; off: string }>> = {
  teachers_always_available: v.confirmYes.teachersAlwaysAvailable,
  meeting_link_auto: v.confirmYes.meetingLinkAuto,
  sales_auto_assign: v.confirmYes.salesAutoAssign,
  sales_require_assignee: v.confirmYes.salesRequireAssignee,
};

/** The yes button says what it does to that switch. */
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

/** Plain confirm for booking-wide switches, typed confirm for retention days that delete data. */
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
