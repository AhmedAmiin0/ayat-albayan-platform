import type { NumberView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { usePermissions } from '@ab/web-kit/auth/use-permissions';
import { templatesQuery } from '@/features/messaging/templates/api';
import { syncNumberTemplates } from '@/features/messaging/numbers/numbers-api';
import { syncErrorText, syncResultText } from './template-sync-text';

const s = t.numbers.templateSync;

/** Module mode reads the WABA list; legacy or crm runs its line's sync (docs/23c decision 9). */
export function NumberTemplateSync({ view }: { view: NumberView }) {
  const queryClient = useQueryClient();
  const allowed = usePermissions().can('templates.manage');
  const sync = useMutation({
    mutationFn: syncNumberTemplates,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: templatesQuery.queryKey }),
  });
  if (!allowed) return null;
  const failed = sync.isError || sync.data?.ok === false;
  let line = '';
  if (sync.isPending) line = s.busy;
  else if (sync.isError) line = syncErrorText(sync.error);
  else if (sync.data) line = syncResultText(sync.data);
  return (
    <div className="grid justify-items-start gap-1">
      <Button
        size="sm"
        variant="secondary"
        disabled={sync.isPending}
        onClick={() => sync.mutate(view.id)}
      >
        {s.button}
      </Button>
      <p
        role="status"
        aria-live="polite"
        className={failed ? 'text-xs font-semibold text-danger' : 'text-xs text-ink-2'}
      >
        {line}
      </p>
    </div>
  );
}
