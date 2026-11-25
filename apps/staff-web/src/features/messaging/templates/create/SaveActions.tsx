import { Button, t } from '@ab/web-kit';

export interface SaveActionsProps {
  formId: string;
  busy: boolean;
  label: string;
  /** Meta would refuse it now (an edit under review or over its limit). */
  disabled?: boolean;
  onClose: () => void;
}

export function SaveActions({ formId, busy, label, disabled = false, onClose }: SaveActionsProps) {
  return (
    <>
      <Button type="button" variant="ghost" onClick={onClose}>
        {t.common.cancel}
      </Button>
      <Button type="submit" form={formId} disabled={busy || disabled}>
        {busy ? t.common.saving : label}
      </Button>
    </>
  );
}
