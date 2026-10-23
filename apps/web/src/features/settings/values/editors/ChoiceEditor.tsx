import { CURRENCY_ISOS, SETTING_FIELD_OF, settingDef } from '@ab/shared';
import { Select } from '@/components/ui/select';
import { TimeZoneSelect } from '@/components/ui/time-zone-select';
import { str } from '../../registry-form/settings-form';
import { valueText } from '../value-format';
import { useValues } from '../values-context';
import { denseClass, describedBy, type EditorProps } from './editor-props';

/** A select of fixed choices: the reporting currency, an enum (feedback mode) or a time zone. */
export function ChoiceEditor({ settingKey, ids, sheet }: EditorProps) {
  const api = useValues();
  const def = settingDef(settingKey);
  const field = SETTING_FIELD_OF[settingKey];
  const value = str(api.drafts.form(settingKey), field);
  const error = api.error(settingKey);
  const common = {
    id: ids.editor,
    'aria-labelledby': ids.label,
    'aria-describedby': describedBy(error && ids.error),
    'aria-invalid': error ? (true as const) : undefined,
    disabled: api.status(settingKey).state === 'saving',
  };
  const set = (v: string) => api.drafts.edit(settingKey, { [field]: v });
  if (def.type === 'tz') return <TimeZoneSelect {...common} className={denseClass(sheet, 'w-[240px]')} value={value} onValue={set} />;
  const options: readonly string[] = def.type === 'enum' ? def.options : CURRENCY_ISOS;
  return (
    <Select {...common} className={denseClass(sheet, 'w-[200px]')} value={value} onChange={(e) => set(e.target.value)}>
      {/* A stored code outside the list stays selectable, so saving never changes it. */}
      {[...new Set([value, ...options])].map((code) => (
        <option key={code} value={code}>
          {def.type === 'enum' ? valueText(settingKey, code) : code}
        </option>
      ))}
    </Select>
  );
}
