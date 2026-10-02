import type { AcademySettings } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { StatusChip } from '@/components/ui/status-chip';
import { t } from '@/lib/i18n';
import { updateSettings } from './api';

const s = t.templates.settings;

/**
 * settings.auto_messages_enabled (migration 162, docs/09 cut-over): the jobs' lesson reminders,
 * follow-ups and renewal reminders. OFF (the default) until the old Apps Script reminders stop;
 * the admin's own sends, booking confirmations and report_ready are not affected. The send gate
 * (MessagingSwitch) still decides whether anything leaves at all.
 */
export function AutoMessagesSwitch({ settings }: { settings: AcademySettings }) {
  const queryClient = useQueryClient();
  const on = settings.auto_messages_enabled;
  const save = useMutation({
    mutationFn: updateSettings,
    onSuccess: (next) => queryClient.setQueryData(['settings'], next),
  });

  return (
    <div className="grid gap-3 border-t border-rule pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">{s.autoMessages}</span>
        <StatusChip tone={on ? 'ok' : 'neutral'} glyph={on ? 'fill' : 'struck'} label={on ? s.autoOn : s.autoOff} />
        <Button
          size="sm"
          variant={on ? 'danger-quiet' : 'secondary'}
          disabled={save.isPending}
          onClick={() => save.mutate({ autoMessagesEnabled: !on })}
        >
          {on ? s.autoDisable : s.autoEnable}
        </Button>
      </div>
      <p className="text-xs text-ink-3">{s.autoMessagesHint}</p>
      {save.isError && <FormAlert>{t.common.error}</FormAlert>}
    </div>
  );
}
