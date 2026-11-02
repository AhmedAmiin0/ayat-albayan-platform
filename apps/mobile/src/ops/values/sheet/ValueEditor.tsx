import { settingDef, type SettingKey } from '@ab/shared';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Field } from '@/core/ui/form/Field';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { choicesOf, editorOf, type Draft, type EditorKind } from '@/ops/values/lib/value-draft';
import { labelOf, optionLabel, textAt } from '@/ops/values/lib/value-text';

interface ValueEditorProps {
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
  const items = choicesOf(valueKey, draft.text).map((o) => ({
    value: o,
    label: optionLabel(valueKey, o),
  }));
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

/** The keyboard of a text value: the phone pad for E.164, the plain one otherwise. */
const textKeyboard = (phone: boolean) => (phone ? 'phone-pad' : 'default');

/** A typed value: digits for numbers, the phone pad for E.164, plain text otherwise. */
function Box({ valueKey, draft, setDraft }: ValueEditorProps) {
  const kind = editorOf(valueKey);
  const phone = settingDef(valueKey).type === 'e164';
  const keyboard = kind === 'text' ? textKeyboard(phone) : 'number-pad';
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

function Switch({ valueKey, draft, setDraft }: ValueEditorProps) {
  return <OnOff label={labelOf(valueKey)} on={draft.on} set={(on) => setDraft({ on })} />;
}

/** A number that can be off: its switch, and the number box while it is on. */
function NullableInt(props: ValueEditorProps) {
  const { valueKey, draft, setDraft } = props;
  return (
    <View style={{ gap: 12 }}>
      <OnOff label={toggleLabel(valueKey)} on={draft.on} set={(on) => setDraft({ on })} />
      {draft.on ? <Box {...props} /> : null}
    </View>
  );
}

/** The editor per kind (docs/36 f5); read-only keys never open the sheet's editor. */
const EDITORS = {
  bool: Switch,
  choice: Choice,
  nullableInt: NullableInt,
  int: Box,
  text: Box,
  readonly: Box,
} satisfies Record<EditorKind, (props: ValueEditorProps) => ReactNode>;

/** The sheet's one editor (16pt text, 44pt tall); multi-field values never reach here. */
export function ValueEditor(props: ValueEditorProps) {
  const Editor = EDITORS[editorOf(props.valueKey)];
  return <Editor {...props} />;
}
