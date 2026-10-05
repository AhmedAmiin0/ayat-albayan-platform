import type { TemplateView } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Toast, type ToastProps } from '@/components/ui/toast';
import { fullTime } from '@/features/inbox/format';
import { t } from '@/lib/i18n';
import { checkTemplateHealth, submitTemplate, templateErrorText, templatesQuery } from './api';
import { SubmitTemplateDialog } from './SubmitTemplateDialog';
import { templateColumns } from './template-columns';

type Notice = Pick<ToastProps, 'message' | 'tone'>;

/** The newest last_checked_at of the registry (one health check stamps every row). */
function lastChecked(rows: readonly TemplateView[]): string | null {
  return rows.reduce<string | null>((max, r) => (r.last_checked_at && (!max || r.last_checked_at > max) ? r.last_checked_at : max), null);
}

/**
 * Template health (R-MSG-01, issue C1): every registry row with Meta's status. «راجع حالة
 * القوالب» reads Meta now (T2); a not-submitted / rejected / missing row can be sent to Meta for
 * review (T3), only after the explicit confirm dialog.
 */
export function TemplateHealth({ headingId }: { headingId: string }) {
  const queryClient = useQueryClient();
  const templates = useQuery(templatesQuery);
  const [submitting, setSubmitting] = useState<TemplateView | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const check = useMutation({
    mutationFn: checkTemplateHealth,
    onSuccess: (rows) => {
      queryClient.setQueryData(templatesQuery.queryKey, rows);
      setNotice({ message: t.templates.checkedNow });
    },
    onError: (e) => setNotice({ message: templateErrorText(e), tone: 'error' }),
  });
  const submit = useMutation({
    mutationFn: submitTemplate,
    onSuccess: async () => {
      setNotice({ message: t.templates.submitted });
      await queryClient.invalidateQueries({ queryKey: templatesQuery.queryKey });
    },
    onError: (e) => setNotice({ message: templateErrorText(e), tone: 'error' }),
    onSettled: () => setSubmitting(null),
  });
  const columns = useMemo(() => templateColumns({ onSubmit: setSubmitting }), []);
  const rows = templates.data ?? [];
  const checked = lastChecked(rows);

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 id={headingId} className="font-display text-h4 font-bold">
          {t.templates.title}
        </h2>
        <span className="text-xs text-ink-3">
          {checked ? t.templates.checkedAt.replace('{time}', fullTime(checked)) : t.templates.neverChecked}
        </span>
        <Button variant="secondary" size="sm" className="ms-auto" disabled={check.isPending} onClick={() => check.mutate()}>
          {check.isPending ? t.templates.checking : t.templates.checkHealth}
        </Button>
      </div>
      <p className="mb-3 max-w-[70ch] text-sm text-ink-2">{t.templates.intro}</p>
      {rows.some((r) => r.status !== 'approved') && (
        <p className="mb-3 border-s border-s-rule ps-3 text-xs font-semibold text-act">
          {t.templates.needsAttention}
        </p>
      )}
      {templates.isError && <p role="alert">{t.common.error}</p>}
      {templates.isPending ? (
        <p className="text-sm text-ink-3">{t.common.loading}</p>
      ) : (
        <DataTable columns={columns} data={rows} getRowId={(r) => r.key} stacked clientSort clientFilter emptyText={t.common.empty} />
      )}
      {submitting && (
        <SubmitTemplateDialog
          template={submitting}
          busy={submit.isPending}
          onConfirm={() => submit.mutate(submitting.key)}
          onClose={() => setSubmitting(null)}
        />
      )}
      {notice && <Toast {...notice} onDismiss={() => setNotice(null)} />}
    </>
  );
}
