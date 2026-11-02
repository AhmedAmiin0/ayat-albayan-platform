import { Button } from '@/components/ui/form/button';
import { ButtonRow } from '@/components/ui/layout/button-row';
import { t } from '@/lib/i18n/i18n';

interface SalesChangeRowProps {
  allowed: { reschedule: boolean; cancel: boolean };
  onPick: (mode: 'move' | 'cancel') => void;
}

/** «تغيير الموعد» (secondary) | «إلغاء الحلقة» (danger), each only with its key; none, no row. */
export function SalesChangeRow({ allowed, onPick }: SalesChangeRowProps) {
  const changes = allowed.reschedule || allowed.cancel;
  if (!changes) return null;
  return (
    <ButtonRow>
      {allowed.reschedule && (
        <Button type="button" variant="secondary" onClick={() => onPick('move')}>
          {t.sales.lessonActions.reschedule}
        </Button>
      )}
      {allowed.cancel && (
        <Button type="button" variant="danger" onClick={() => onPick('cancel')}>
          {t.sales.lessonActions.cancel}
        </Button>
      )}
    </ButtonRow>
  );
}
