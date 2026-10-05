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
 * (MessagingSwitch) still decides whether anything leaves at all. Switched on while the cut-over
 * (crm_cutover_done) is not ticked, it reads as the admin's turn with «اتأكد إن تذكيرات … وقفت».
 */
export function AutoMessagesSwitch({ settings }: { settings: AcademySettings }) {
  const queryClient = useQueryClient();
  const on = settings.auto_messages_enabled;
  // On before the cut-over is ticked: families may get the Apps Script reminder too (the admin's turn).
  const risky = on && !settings.crm_cutover_done;
  const chip = risky
    ? ({ tone: 'act', glyph: 'hollow' } as const)
    : on
      ? ({ tone: 'ok', glyph: 'fill' } as const)
      : ({ tone: 'neutral', glyph: 'struck' } as const);
  const save = useMutation({
    mutationFn: updateSettings,
    onSuccess: (next) => queryClient.setQueryData(['settings'], next),
  });

  return (
    <div className="grid gap-3 border-t border-rule pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">{s.autoMessages}</span>
        <StatusChip {...chip} label={on ? s.autoOn : s.autoOff} />
        <Button
          size="sm"
          variant={on ? 'danger-quiet' : 'secondary'}
          disabled={save.isPending}
          onClick={() => save.mutate({ autoMessagesEnabled: !on })}
        >
          {on ? s.autoDisable : s.autoEnable}
        </Button>
      </div>
      {risky && <p className="border-s border-s-rule ps-3 text-xs font-semibold text-act">{s.autoCheckScript}</p>}
      <p className="text-xs text-ink-3">{s.autoMessagesHint}</p>
      {save.isError && <FormAlert>{t.common.error}</FormAlert>}
    </div>
  );
}
