import { settingDef, type SettingKey } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Field } from '@/core/ui/form/Field';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { choicesOf, editorOf, type Draft } from '../lib/value-draft';
import { labelOf, optionLabel, textAt } from '../lib/value-text';

export interface ValueEditorProps {
  valueKey: SettingKey;
  draft: Draft;
  setDraft: (patch: Partial<Draft>) => void;
}

/** «مفعّل / مغلق» as two 44pt radios (a switch, or a number that can be off). */
function OnOff({ label, on, set }: { label: string; on: boolean; set: (on: boolean) => void }) {
  const m = t.mobileAdmin.settings;
  return (
    <FilterPills
      role="radiogroup"
      accessibilityLabel={label}
      value={on ? 'on' : 'off'}
      onChange={(v) => set(v === 'on')}
      items={[
        { value: 'on', label: m.on },
        { value: 'off', label: m.off },
      ]}
    />
  );
}

/** A picked value (enum, currency, zone): every option in view as 44pt radios. */
function Choice({ valueKey, draft, setDraft }: ValueEditorProps) {
  const items = choicesOf(valueKey, draft.text).map((o) => ({ value: o, label: optionLabel(valueKey, o) }));
  return (
    <FilterPills
      role="radiogroup"
      wrap
      accessibilityLabel={labelOf(valueKey)}
      value={draft.text}
      onChange={(text) => setDraft({ text })}
      items={items}
    />
  );
}

/** A typed value: digits for numbers, the phone pad for E.164, plain text otherwise. */
function Box({ valueKey, draft, setDraft }: ValueEditorProps) {
  const kind = editorOf(valueKey);
  const phone = settingDef(valueKey).type === 'e164';
  const keyboard = kind !== 'text' ? 'number-pad' : phone ? 'phone-pad' : 'default';
  return (
    <Field
      label={labelOf(valueKey)}
      value={draft.text}
      onChangeText={(text) => setDraft({ text })}
      keyboardType={keyboard}
      ltr={kind !== 'text' || phone}
    />
  );
}

/** The switch label of a number that can be off («احسب الإلغاء المتأخر»), else the row's name. */
function toggleLabel(key: SettingKey): string {
  const def = settingDef(key);
  const path = def.type === 'int' ? def.toggleLabelKey : undefined;
  return (path ? textAt(path) : undefined) ?? labelOf(key);
}

/** The sheet's one editor (16pt text, 44pt tall); multi-field values never reach here. */
export function ValueEditor(props: ValueEditorProps) {
  const { valueKey, draft, setDraft } = props;
  const kind = editorOf(valueKey);
  if (kind === 'bool') return <OnOff label={labelOf(valueKey)} on={draft.on} set={(on) => setDraft({ on })} />;
  if (kind === 'choice') return <Choice {...props} />;
  if (kind !== 'nullableInt') return <Box {...props} />;
  return (
    <View style={{ gap: 12 }}>
      <OnOff label={toggleLabel(valueKey)} on={draft.on} set={(on) => setDraft({ on })} />
      {draft.on ? <Box {...props} /> : null}
    </View>
  );
}
