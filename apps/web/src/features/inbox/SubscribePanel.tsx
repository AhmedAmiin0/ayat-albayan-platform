import type { ThreadPeople } from '@ab/shared';
import { railXl } from '@/components/ui/layout/rail';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Ltr } from '@/components/ui/display/ltr';
import { StatusChip } from '@/components/ui/display/status-chip';
import { Toast } from '@/components/ui/overlay/toast';
import { CreateSubscriptionDialog } from '@/features/subscriptions/CreateSubscriptionDialog';
import type { PickedStudent } from '@/features/subscriptions/StudentPicker';
import { t } from '@/lib/i18n';
import { dueText, packageChipProps, packageLine, subscribeLabel } from './subscription';

/**
 * The guardian's children beside the chat (R-SUB-01): each one's package line («8 حلقات في الشهر —
 * فاضل 3 حلقات», «عليه 290 ر.س») and «اشتراك جديد» / «جدّد الاشتراك» for that child. The rows are
 * the picker: a family with several children gets one button per child.
 */
export function SubscribePanel({ people }: { people: ThreadPeople }) {
  const queryClient = useQueryClient();
  const [picked, setPicked] = useState<PickedStudent | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const saved = async () => {
    setPicked(null);
    setToast(t.subscriptions.saved);
    // The dialog refreshes the money screens; the chip, the lines and the list tag live under
    // threads; the family's lead may have just become «مشترك» (R-LEAD-01).
    for (const key of ['threads', 'leads'])
      await queryClient.invalidateQueries({ queryKey: [key] });
  };

  return (
    <aside
      aria-label={t.inbox.subscription.title}
      className={cn('grid content-start gap-3', railXl)}
    >
      <h3 className="text-sm font-semibold">{t.inbox.subscription.title}</h3>
      {people.students.length === 0 && (
        <p className="text-sm text-ink-3">{t.subscriptions.emptyList}</p>
      )}
      <ul className="grid gap-4">
        {people.students.map((s) => {
          const sub = s.subscription;
          const due = sub && dueText(sub);
          return (
            <li
              key={s.id}
              className="grid justify-items-start gap-1.5 border-b border-rule pb-3 text-sm"
            >
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-semibold text-ink">{s.name}</span>
                <Ltr className="text-xs text-ink-3">{s.code}</Ltr>
              </span>
              {sub ? (
                <>
                  <StatusChip size="sm" {...packageChipProps(sub)} />
                  <span className="text-ink-2">{packageLine(sub)}</span>
                  {due && <span className="font-semibold text-act">{due}</span>}
                </>
              ) : (
                <span className="text-ink-3">{t.subscriptions.empty}</span>
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                aria-label={`${subscribeLabel(sub)} — ${s.name}`}
                onClick={() => setPicked({ id: s.id, name: s.name, code: s.code })}
              >
                {subscribeLabel(sub)}
              </Button>
            </li>
          );
        })}
      </ul>
      {picked && (
        <CreateSubscriptionDialog
          student={picked}
          onClose={() => setPicked(null)}
          onSaved={() => void saved()}
        />
      )}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </aside>
  );
}
