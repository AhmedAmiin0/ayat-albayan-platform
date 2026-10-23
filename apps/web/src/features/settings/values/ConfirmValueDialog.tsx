import { useId, useState } from 'react';
import { ConfirmSwitchDialog } from '@/components/settings/ConfirmSwitchDialog';
import { settingText } from '@/components/settings/setting-text';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';
import type { PendingConfirm } from './use-values-controller';

const c = t.settingsValues.confirm;

function TypedDialog({ pending, onYes, onClose }: { pending: PendingConfirm; onYes: () => void; onClose: () => void }) {
  const id = useId();
  const [typed, setTyped] = useState('');
  const days = String(pending.value);
  const words = settingText(pending.key);
  const ok = typed.trim() === days;
  return (
    <Dialog
      compact
      title={c.typedTitle.replace('{n}', days)}
      glyph={{ tone: 'bad', shape: 'struck' }}
      description={c.typedBody}
      onClose={onClose}
      hint={c.logged}
      actions={
        <>
          <Button variant="secondary" data-autofocus onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button variant="danger" aria-disabled={!ok || undefined} onClick={() => ok && onYes()}>
            {c.typedYes}
          </Button>
        </>
      }
    >
      {(words.toggleHint ?? words.hint) && <p className="mb-3 text-sm text-ink-2">{words.toggleHint ?? words.hint}</p>}
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {c.typedLabel.replace('{n}', days)}
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
export function ConfirmValueDialog({ pending, onYes, onClose }: { pending: PendingConfirm; onYes: () => void; onClose: () => void }) {
  if (pending.kind === 'typed') return <TypedDialog pending={pending} onYes={onYes} onClose={onClose} />;
  const words = settingText(pending.key);
  return (
    <ConfirmSwitchDialog
      title={c.plainTitle.replace('{name}', words.label)}
      description={words.hint ?? c.logged}
      yes={c.plainYes}
      onYes={onYes}
      onClose={onClose}
      pending={false}
      failed={false}
    >
      <p className="text-xs text-ink-3">{c.logged}</p>
    </ConfirmSwitchDialog>
  );
}
