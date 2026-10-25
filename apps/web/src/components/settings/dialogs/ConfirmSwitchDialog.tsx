import type { ReactNode } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';

export interface ConfirmSwitchProps {
  title: string;
  /** What the change does, in plain words (who is reached, what stops). */
  description: string;
  yes: string;
  onYes: () => void;
  onClose: () => void;
  pending: boolean;
  failed: boolean;
  children?: ReactNode;
}

/**
 * A dangerous switch asks first (docs/23a §E H4): cancel is the default focus, the consequence is
 * spelled out, and a failed save stays inside the dialog.
 */
export function ConfirmSwitchDialog({ title, description, yes, onYes, onClose, pending, failed, children }: ConfirmSwitchProps) {
  return (
    <Dialog
      title={title}
      glyph={{ tone: 'act', shape: 'hollow' }}
      description={description}
      onClose={onClose}
      compact
      actions={
        <>
          <Button variant="secondary" data-autofocus onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button variant="danger-quiet" disabled={pending} onClick={onYes}>
            {yes}
          </Button>
        </>
      }
    >
      {children}
      {failed && <FormAlert className="mt-3">{t.common.error}</FormAlert>}
    </Dialog>
  );
}
