import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { assignUnassigned } from '@/features/sales/api';
import { t } from '@/lib/i18n';

/** «عيّن العملاء من غير مسؤول»: spreads every ownerless lead, then says «اتعيّن {n} عميل». */
export function AssignUnassignedButton() {
  const queryClient = useQueryClient();
  const run = useMutation({
    mutationFn: assignUnassigned,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
      await queryClient.invalidateQueries({ queryKey: ['sales', 'people'] });
    },
  });
  return (
    <span className="ms-auto flex flex-wrap items-center gap-2">
      {run.isSuccess && (
        <span role="status" className="text-sm text-ink-2">
          {t.sales.assign.assignedN.replace('{n}', String(run.data.assigned))}
        </span>
      )}
      {run.isError && <span role="alert" className="text-sm text-act">{t.common.error}</span>}
      <Button type="button" variant="secondary" size="sm" disabled={run.isPending} onClick={() => run.mutate()}>
        {t.sales.assign.assignAll}
      </Button>
    </span>
  );
}
