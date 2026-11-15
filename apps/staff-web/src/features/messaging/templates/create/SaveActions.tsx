import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';

export interface SaveActionsProps {
  formId: string;
  busy: boolean;
  /** The submit's words («حفظ القالب», «حفظ التعديل», «إرسال إلى ميتا»). */
  label: string;
  /** Meta would refuse it now (an edit under review or over its limit). */
  disabled?: boolean;
  onClose: () => void;
}

/** «إلغاء» and the form's submit, outside the form in a dialog's footer. */
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
