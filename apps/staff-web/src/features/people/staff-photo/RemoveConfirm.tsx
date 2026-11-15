import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';

const P = t.staffPhoto;

export interface RemoveConfirmProps {
  /** Whose photo: named in the question. */
  name: string;
  pending: 'upload' | 'remove' | null;
  onRemove: () => void;
  onCancel: () => void;
}

/**
 * «حذف الصورة؟» in place (the user panel is already a dialog). Opening it moves focus to its
 * danger button, so a keyboard or screen-reader user lands on the question's answer.
 */
export function RemoveConfirm({ name, pending, onRemove, onCancel }: RemoveConfirmProps) {
  const danger = useRef<HTMLButtonElement>(null);
  useEffect(() => danger.current?.focus(), []);
  const busy = pending !== null;
  return (
    <div role="group" aria-label={P.remove} className="grid gap-2 rounded-md border border-rule bg-sunk p-3">
      <p className="text-sm text-pretty text-ink">{P.confirmRemove.replace('{name}', name)}</p>
      <div className="flex flex-wrap gap-2">
        <Button ref={danger} type="button" variant="danger" size="sm" disabled={busy} onClick={onRemove}>
          {pending === 'remove' ? P.removing : P.remove}
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onCancel}>
          {t.common.cancel}
        </Button>
      </div>
    </div>
  );
}
