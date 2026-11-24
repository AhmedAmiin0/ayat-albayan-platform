import type { SalesFamilyStudent } from '@ab/shared';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Dialog } from '@ab/web-kit/components/ui/overlay/dialog';
import { studentLabel } from '@/features/finance/subscriptions';
import { t } from '@ab/web-kit/lib/i18n/i18n';

type Props = { title: string; students: SalesFamilyStudent[]; onPick: (student: SalesFamilyStudent) => void; onClose: () => void };

/** No child names in chat actions: one action per family, then this picks the child. */
export function ChildChoiceDialog({ title, students, onPick, onClose }: Props) {
  const cancel = (
    <Button type="button" variant="ghost" onClick={onClose}>
      {t.common.cancel}
    </Button>
  );
  return (
    <Dialog title={title} description={t.salesMoney.pickChild} onClose={onClose} actions={cancel}>
      <div className="grid gap-2">
        {students.map((s) => (
          <Button key={s.id} type="button" variant="secondary" className="min-h-11 justify-start" onClick={() => onPick(s)}>
            {studentLabel(s)}
          </Button>
        ))}
      </div>
    </Dialog>
  );
}
