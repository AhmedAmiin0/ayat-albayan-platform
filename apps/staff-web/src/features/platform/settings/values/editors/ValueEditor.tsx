import { SETTING_FIELD_OF, settingDef, type SettingDef, type SettingKey } from '@ab/shared';
import type { ReactNode } from 'react';
import { flag } from '@/features/platform/settings/registry-form/settings-form';
import { useValues } from '@/features/platform/settings/values/values-context';
import { ChoiceEditor } from './ChoiceEditor';
import type { EditorProps } from './editor-props';
import { NumberEditor } from './NumberEditor';
import { ReopenTemplateEditor } from './ReopenTemplateEditor';
import { RowMessage } from './RowMessage';
import { ShapeEditor } from './ShapeEditor';
import { ShapeFields } from './ShapeFields';
import { TextEditor } from './TextEditor';
import { ValueSwitch } from './ValueSwitch';

function BoolEditor({ settingKey, ids, sheet }: EditorProps) {
  const api = useValues();
  const field = SETTING_FIELD_OF[settingKey];
  return (
    <ValueSwitch
      checked={flag(api.drafts.form(settingKey), field)}
      labelledBy={ids.label}
      disabled={api.status(settingKey).state === 'saving'}
      // In the table a switch saves at once (after its confirmation); in the sheet «احفظ» saves.
      onChange={(on) =>
        sheet
          ? api.drafts.edit(settingKey, { [field]: on })
          : api.apply(settingKey, { [field]: on })
      }
    />
  );
}

function SheetShape({ settingKey, ids }: EditorProps) {
  const api = useValues();
  const error = api.error(settingKey);
  return (
    <ShapeFields
      settingKey={settingKey}
      form={api.drafts.form(settingKey)}
      errorId={error ? ids.error : undefined}
      disabled={api.status(settingKey).state === 'saving'}
      onChange={(patch) => api.drafts.edit(settingKey, patch)}
    />
  );
}

function JsonEditor(props: EditorProps) {
  return props.sheet ? <SheetShape {...props} /> : <ShapeEditor {...props} />;
}

/** The control per setting type (docs/36 f5; exhaustive over the registry's types). */
const EDITORS = {
  bool: BoolEditor,
  int: NumberEditor,
  int_list: NumberEditor,
  enum: ChoiceEditor,
  currency: ChoiceEditor,
  tz: ChoiceEditor,
  json: JsonEditor,
  string: TextEditor,
  e164: TextEditor,
} satisfies Record<SettingDef['type'], (props: EditorProps) => ReactNode>;

/** A key with its own control instead of its type's (owner 2026-11-06: the reopen choice). */
const KEY_EDITORS: Partial<Record<SettingKey, (props: EditorProps) => ReactNode>> = {
  chat_reopen_template: ReopenTemplateEditor,
};

function Control(props: EditorProps) {
  const Editor = KEY_EDITORS[props.settingKey] ?? EDITORS[settingDef(props.settingKey).type];
  return <Editor {...props} />;
}

/** The row's editor by type (docs/26b §2 «القيمة»), with its error and save result under it. */
export function ValueEditor(props: EditorProps) {
  return (
    <div className="grid min-w-0 gap-1">
      <Control {...props} />
      <RowMessage settingKey={props.settingKey} ids={props.ids} />
    </div>
  );
}
