import { SETTING_FIELD_OF, settingDef } from '@ab/shared';
import { settingText } from '@/components/settings/search/setting-text';
import { Input } from '@/components/ui/form/input';
import { cn } from '@/lib/utils';
import { flag, onKey, str } from '../../registry-form/settings-form';
import { boundsText } from '../value-format';
import { unitWord } from '../value-units';
import { useValues } from '../values-context';
import { denseClass, describedBy, type EditorProps } from './editor-props';
import { ValueSwitch } from './ValueSwitch';

// The browser's up/down arrows sit over the digits of a narrow box: hidden (the keyboard still steps).
const NO_SPIN = '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

/**
 * A count with its unit (rule 6: never a time of day), bounds linked by aria-describedby. A number
 * that can be OFF (late cancel, recording retention) has its switch in the same cell.
 */
export function NumberEditor({ settingKey, ids, sheet }: EditorProps) {
  const api = useValues();
  const def = settingDef(settingKey);
  if (def.type !== 'int' && def.type !== 'int_list') return null;
  const field = SETTING_FIELD_OF[settingKey];
  const form = api.drafts.form(settingKey);
  const saving = api.status(settingKey).state === 'saving';
  const error = api.error(settingKey);
  const nullable = def.type === 'int' && def.nullable === true;
  const on = !nullable || flag(form, onKey(field));
  const typed = str(form, field).trim();
  const unit = unitWord(settingKey, def.type === 'int' && typed !== '' ? Number(typed) : undefined);
  const words = settingText(settingKey);
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {nullable && (
        <ValueSwitch
          checked={on}
          label={words.toggle ?? words.label}
          disabled={saving}
          onChange={(checked) => api.drafts.edit(settingKey, { [onKey(field)]: checked })}
        />
      )}
      <span className="inline-flex items-center gap-1.5">
        <Input
          id={ids.editor}
          type={def.type === 'int_list' ? 'text' : 'number'}
          inputMode="numeric"
          dir="ltr"
          min={def.min}
          max={def.max}
          aria-labelledby={ids.label}
          aria-describedby={describedBy(boundsText(settingKey) && ids.bounds, error && ids.error)}
          aria-invalid={error ? true : undefined}
          disabled={saving || !on}
          value={str(form, field)}
          onChange={(e) => api.drafts.edit(settingKey, { [field]: e.target.value })}
          className={cn(denseClass(sheet, 'w-24'), 'tabular-nums', NO_SPIN)}
        />
        {unit && <span className="text-xs text-ink-3">{unit}</span>}
      </span>
    </span>
  );
}
