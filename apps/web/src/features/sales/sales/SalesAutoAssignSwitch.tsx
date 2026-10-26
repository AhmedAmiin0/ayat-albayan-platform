import type { AcademySettings } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';
import { useSettingSwitch } from '@/lib/settings/use-setting-switch';

const s = t.sales.assign;

/**
 * settings.sales_auto_assign: a new lead goes to the salesperson with the fewest leads. Read from
 * GET /settings, written with PATCH /settings { salesAutoAssign }, like the other switches.
 */
export function SalesAutoAssignSwitch({ settings }: { settings: AcademySettings }) {
  const on = settings.sales_auto_assign;
  const save = useSettingSwitch();
  return (
    <div className="grid gap-3 border-t border-rule pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">{s.auto}</span>
        <StatusChip tone={on ? 'ok' : 'neutral'} glyph={on ? 'fill' : 'struck'} label={on ? s.autoOn : s.autoOff} />
        <Button
          size="sm"
          variant={on ? 'danger-quiet' : 'secondary'}
          disabled={save.isPending}
          onClick={() => save.mutate({ salesAutoAssign: !on })}
        >
          {on ? s.autoDisable : s.autoEnable}
        </Button>
      </div>
      <p className="text-xs text-ink-3">{s.autoHint}</p>
      {save.isError && <FormAlert>{t.common.error}</FormAlert>}
    </div>
  );
}
