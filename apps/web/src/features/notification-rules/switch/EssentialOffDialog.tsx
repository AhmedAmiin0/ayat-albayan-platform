import { ESSENTIAL_OFF_TEXT } from '@ab/shared';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormAlert } from '@/components/ui/form-alert';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';
import { fillText } from '../rule-text';

const e = t.notificationRules.essentialOff;

export interface EssentialOffDialogProps {
  name: string;
  pending: boolean;
  /** The refusal in words (a 428 or another failure), shown inside the dialog. */
  error: string | null;
  onYes: (confirmText: string) => void;
  onClose: () => void;
}

/**
 * An essential row («أساسي»: booking confirmation, report PDF) turns off only with the typed word
 * «إيقاف» (docs/23 owner answer 3): the button stays disabled until it matches; «إلغاء» is focused.
 */
export function EssentialOffDialog({ name, pending, error, onYes, onClose }: EssentialOffDialogProps) {
  const id = useId();
  const hintId = useId();
  const [typed, setTyped] = useState('');
  const ok = typed.trim() === ESSENTIAL_OFF_TEXT;
  return (
    <Dialog
      compact
      title={fillText(e.title, { name })}
      glyph={{ tone: 'bad', shape: 'struck' }}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" data-autofocus onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button variant="danger" disabled={!ok || pending} onClick={() => onYes(typed.trim())}>
            {e.yes}
          </Button>
        </>
      }
    >
      <p id={hintId} className="mb-3 text-sm text-ink-2">
        {e.body}
      </p>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {fillText(e.label, { word: ESSENTIAL_OFF_TEXT })}
      </label>
      <Input id={id} autoComplete="off" aria-describedby={hintId} value={typed} onChange={(ev) => setTyped(ev.target.value)} className="max-w-48" />
      {error && <FormAlert className="mt-3">{error}</FormAlert>}
    </Dialog>
  );
}
