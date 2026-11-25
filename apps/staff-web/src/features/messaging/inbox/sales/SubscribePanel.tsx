import type { ThreadPeople } from '@ab/shared';
import { studentStatusStyle } from '@ab/money';
import { Link } from '@tanstack/react-router';
import { railXl } from '@ab/web-kit/components/ui/layout/rail';
import { cn } from '@ab/web-kit/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { StatusChip } from '@ab/web-kit/components/ui/display/status-chip';
import { Toast } from '@ab/web-kit/components/ui/overlay/toast';
import { CreateSubscriptionDialog } from '@/features/finance/subscriptions/create/CreateSubscriptionDialog';
import type { PickedStudent } from '@/features/finance/subscriptions/create/StudentPicker';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { threadKeys } from '@/features/messaging/inbox/api/keys';
import { leadKeys } from '@/features/sales/keys';
import { SearchFromProfile } from '@/features/messaging/inbox/search';
import { dueText, packageChipProps, packageLine, subscribeLabel } from './subscription';

/** A family with several children gets one subscribe button per child (R-SUB-01). */
export function SubscribePanel({ people }: { people: ThreadPeople }) {
  const queryClient = useQueryClient();
  const [picked, setPicked] = useState<PickedStudent | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const saved = async () => {
    setPicked(null);
    setToast(t.subscriptions.saved);
    // The family's lead may have just become subscribed (R-LEAD-01), so threads and leads refresh.
    for (const queryKey of [threadKeys.all, leadKeys.all])
      await queryClient.invalidateQueries({ queryKey });
  };

  return (
    <aside
      aria-label={t.inbox.subscription.title}
      className={cn('grid content-start gap-3', railXl)}
    >
      <SearchFromProfile />
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
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Link
                  to="/admin/students/$studentId"
                  params={{ studentId: s.id }}
                  aria-label={t.students.family.openStudent.replace('{name}', s.name)}
                  className="font-semibold text-lapis underline underline-offset-4"
                >
                  {s.name}
                </Link>
                <Ltr className="text-xs text-ink-3">{s.code}</Ltr>
                <StatusChip
                  size="sm"
                  {...studentStatusStyle[s.status]}
                  label={t.enums.studentStatus[s.status]}
                />
                {s.teacher_name && <span className="text-xs text-ink-3">{s.teacher_name}</span>}
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
