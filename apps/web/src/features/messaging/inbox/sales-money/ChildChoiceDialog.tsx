import type { SalesFamilyStudent } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { studentLabel } from '@/features/finance/subscriptions';
import { t } from '@/lib/i18n/i18n';

type Props = { title: string; students: SalesFamilyStudent[]; onPick: (student: SalesFamilyStudent) => void; onClose: () => void };

/**
 * «لأيّ طالب؟» (owner 2026-10-29: no child names in the chat's actions): one «أيام الحلقات» or «موعد تجريبي جديد»
 * for the family, and with several of her children this picks one; the action's own dialog opens next.
 */
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
