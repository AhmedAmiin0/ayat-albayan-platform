import type { AcademySettings } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { StatusChip } from '@/components/ui/status-chip';
import { apiSend } from '@/lib/api';
import { t } from '@/lib/i18n';

const s = t.sales.assign;

/**
 * settings.sales_auto_assign: a new lead goes to the salesperson with the fewest leads. Read from
 * GET /settings, written with PATCH /settings { salesAutoAssign }, like the other switches.
 */
export function SalesAutoAssignSwitch({ settings }: { settings: AcademySettings }) {
  const queryClient = useQueryClient();
  const on = settings.sales_auto_assign;
  const save = useMutation({
    mutationFn: (salesAutoAssign: boolean) => apiSend<AcademySettings>('PATCH', '/settings', { salesAutoAssign }),
    onSuccess: (next) => queryClient.setQueryData(['settings'], next),
  });
  return (
    <div className="grid gap-3 border-t border-rule pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">{s.auto}</span>
        <StatusChip tone={on ? 'ok' : 'neutral'} glyph={on ? 'fill' : 'struck'} label={on ? s.autoOn : s.autoOff} />
        <Button
          size="sm"
          variant={on ? 'danger-quiet' : 'secondary'}
          disabled={save.isPending}
          onClick={() => save.mutate(!on)}
        >
          {on ? s.autoDisable : s.autoEnable}
        </Button>
      </div>
      <p className="text-xs text-ink-3">{s.autoHint}</p>
      {save.isError && <FormAlert>{t.common.error}</FormAlert>}
    </div>
  );
}
