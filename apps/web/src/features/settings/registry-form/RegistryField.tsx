import { CURRENCY_ISOS, SETTING_FIELD_OF, settingDef, type SettingKey } from '@ab/shared';
import { CheckField } from '@/components/settings/CheckField';
import { NumberField } from '@/components/settings/NumberField';
import { settingText } from '@/components/settings/setting-text';
import { SettingRow, type RowExtras, type SettingRowProps } from '@/components/settings/SettingRow';
import { useSettingsView } from '@/components/settings/settings-view';
import { Input } from '@/components/ui/form/input';
import { Select } from '@/components/ui/form/select';
import { TimeZoneSelect } from '@/components/ui/form/time-zone-select';
import { ResetButton } from './ResetButton';
import { RowNotes } from './RowNotes';
import { ShapeRow } from './ShapeRow';
import { flag, onKey, str } from './settings-form';
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
  const { meta } = useSettingsView();
  const def = settingDef(settingKey);
  const field = SETTING_FIELD_OF[settingKey];
  const words = settingText(settingKey);
  const extras: RowExtras = {
    extra: <RowNotes dirty={state.dirty(settingKey)} meta={meta[settingKey]} />,
    actions: state.atDefault(settingKey) ? null : <ResetButton name={words.label} onClick={() => state.reset(settingKey)} />,
  };
  if (def.type === 'json') return <ShapeRow settingKey={settingKey} state={state} extras={extras} />;
  const value = str(form, field);
  const setText = (v: string) => set({ [field]: v });
  const error = errors[field];
  if (def.type === 'bool') {
    return <CheckField {...extras} label={words.label} hint={words.hint} checked={flag(form, field)} onChange={(v) => set({ [field]: v })} />;
  }
  if (def.type === 'int' || def.type === 'int_list') {
    const on = def.type === 'int' && def.nullable ? flag(form, onKey(field)) : null;
    return (
      <>
        {on !== null && (
          <CheckField {...extras} label={words.toggle ?? words.label} hint={words.toggleHint} checked={on} onChange={(v) => set({ [onKey(field)]: v })} />
        )}
        <NumberField {...(on === null ? extras : {})} list={def.type === 'int_list'} label={words.label} hint={words.hint} disabled={on === false} value={value} error={error} onChange={setText} />
      </>
    );
  }
  return (
    <SettingRow {...extras} label={words.label} hint={words.hint} error={error}>
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
