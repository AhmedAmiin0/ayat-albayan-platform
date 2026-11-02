import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { formatDate } from '@/features/sales/leads';
import { t } from '@/lib/i18n/i18n';
import { completeTask, MONEY_KEY, openTasksQuery } from '@/features/finance/subscriptions/api';
import { taskText } from '@/features/finance/subscriptions/format';

/**
 * R-SUB-02 admin tasks: «باقة سهيلة قربت تخلص» / «… خلصت ومحتاجة تجديد». Each is work
 * waiting for the admin (saffron «دورك» glyph), done with one click.
 */
export function OpenTasks() {
  const queryClient = useQueryClient();
  const tasks = useQuery(openTasksQuery);
  const done = useMutation({
    mutationFn: completeTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MONEY_KEY }),
  });
  const items = tasks.data?.items ?? [];

  return (
    <section aria-labelledby="money-tasks" className="mt-8 border-t border-rule pt-5">
      <h2 id="money-tasks" className="mb-3 font-display text-h3 font-bold">
        {t.dashboard.tasks}
      </h2>
      {tasks.isSuccess && items.length === 0 && <p className="text-sm text-ink-3">{t.dashboard.noTasks}</p>}
      <ul className="grid divide-y divide-rule">
        {items.map((task) => (
          <li key={task.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
            <NuqtaGlyph shape="hollow" className="text-act" />
            <span className="min-w-0 flex-1 text-sm text-ink">{taskText(task)}</span>
            <span className="text-2xs text-ink-3 tabular-nums">{formatDate(task.created_at)}</span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={done.isPending}
              onClick={() => done.mutate(task.id)}
            >
              {t.dashboard.taskDone}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
