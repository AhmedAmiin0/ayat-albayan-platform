import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';

export interface DialogActionsProps {
  onCancel: () => void;
  label: string;
  disabled: boolean;
  /** A submit button of this form id; else a plain button running `onConfirm`. */
  form?: string;
  onConfirm?: () => void;
}

/** «إلغاء» and the dialog's one primary action. */
export function DialogActions({ onCancel, label, disabled, form, onConfirm }: DialogActionsProps) {
  return (
    <>
      <Button type="button" variant="ghost" onClick={onCancel}>
        {t.peopleEdit.cancel}
      </Button>
      <Button type={form ? 'submit' : 'button'} form={form} disabled={disabled} onClick={onConfirm}>
        {label}
      </Button>
    </>
  );
}
