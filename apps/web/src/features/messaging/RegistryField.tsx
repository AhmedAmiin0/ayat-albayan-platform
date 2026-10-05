import { CURRENCY_ISOS, SETTING_FIELD_OF, settingDef, type SettingKey } from '@ab/shared';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { TimeZoneSelect } from '@/components/ui/time-zone-select';
import { flag, onKey, str } from './settings-form';
import { CheckField, NumberField, SettingRow, type SettingRowProps } from './SettingsFields';
import { settingText } from './setting-text';
import type { SettingsFormState } from './use-settings-form';

type ControlProps = Parameters<SettingRowProps['children']>[0];

/** A select of fixed codes; a stored code outside the list stays selectable, so saving never changes it. */
function CodeSelect(p: { control: ControlProps; value: string; options: readonly string[]; onValue: (v: string) => void }) {
  return (
    <Select {...p.control} className="w-[140px]" value={p.value} onChange={(e) => p.onValue(e.target.value)}>
      {[...new Set([p.value, ...p.options])].map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </Select>
  );
}

/**
 * One registry setting as a row of /admin/settings, its control chosen by type: a switch, a count
 * (with an ON/OFF switch when null means OFF), a list of counts, a code, a time zone or text.
 */
export function RegistryField({ settingKey, state }: { settingKey: SettingKey; state: SettingsFormState }) {
  const { form, errors, set } = state;
  const def = settingDef(settingKey);
  const field = SETTING_FIELD_OF[settingKey];
  const words = settingText(settingKey);
  const value = str(form, field);
  const setText = (v: string) => set({ [field]: v });
  const error = errors[field];
  if (def.type === 'bool') {
    return <CheckField label={words.label} hint={words.hint} checked={flag(form, field)} onChange={(v) => set({ [field]: v })} />;
  }
  if (def.type === 'int' || def.type === 'int_list') {
    const on = def.type === 'int' && def.nullable ? flag(form, onKey(field)) : null;
    return (
      <>
        {on !== null && (
          <CheckField label={words.toggle ?? words.label} hint={words.toggleHint} checked={on} onChange={(v) => set({ [onKey(field)]: v })} />
        )}
        <NumberField list={def.type === 'int_list'} label={words.label} hint={words.hint} disabled={on === false} value={value} error={error} onChange={setText} />
      </>
    );
  }
  return (
    <SettingRow label={words.label} hint={words.hint} error={error}>
      {(p) =>
        def.type === 'currency' || def.type === 'enum' ? (
          <CodeSelect control={p} value={value} options={def.type === 'enum' ? def.options : CURRENCY_ISOS} onValue={setText} />
        ) : def.type === 'tz' ? (
          <TimeZoneSelect {...p} className="w-[260px]" value={value} onValue={setText} />
        ) : (
          <Input {...p} dir={def.type === 'e164' ? 'ltr' : undefined} className="w-[220px]" value={value} onChange={(e) => setText(e.target.value)} />
        )
      }
    </SettingRow>
  );
}
