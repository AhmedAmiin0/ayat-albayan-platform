import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { Toast } from '@/components/ui/overlay/toast';
import { t } from '@/lib/i18n/i18n';
import { DASHBOARD_KEY, markTaskDone } from '../api';
import { workItem, workLink } from '../today/PendingReportsList';
import type { TaskRow } from '../types';
import { taskText } from './work-text';

/** Open admin tasks (renewal due, unpaid) with «خلصت» (POST /admin-tasks/:id/done, docs/11 S8). */
export function TasksList({ items }: { items: readonly TaskRow[] }) {
  const qc = useQueryClient();
  const [toast, setToast] = useState<{ message: string; tone: 'info' | 'error' } | null>(null);
  const done = useMutation({
    mutationFn: markTaskDone,
    onSuccess: async () => {
      setToast({ message: t.dashboard.taskClosed, tone: 'info' });
      await qc.invalidateQueries({ queryKey: DASHBOARD_KEY });
    },
    onError: () => setToast({ message: t.common.error, tone: 'error' }),
  });
  return (
    <>
      {items.length === 0 ? (
        <p className="py-3 text-sm text-ink-2">{t.dashboard.noTasks}</p>
      ) : (
        <ul>
          {items.map((task) => (
            <li key={task.id} className={workItem}>
              <NuqtaGlyph shape="hollow" className="size-[9px] shrink-0 text-act" />
              <span className="font-semibold">{taskText(task)}</span>
              {task.title && <span className="text-xs text-ink-2">{task.title}</span>}
              <span className="ms-auto flex items-center gap-3">
                {task.student && (
                  <Link
                    to="/admin/students/$studentId"
                    params={{ studentId: task.student.id }}
                    aria-label={t.students.openProfile.replace('{name}', task.student.name)}
                    className={workLink}
                  >
                    {t.students.profile}
                  </Link>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={done.isPending && done.variables === task.id}
                  onClick={() => done.mutate(task.id)}
                >
                  {t.dashboard.taskDone}
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </>
  );
}
