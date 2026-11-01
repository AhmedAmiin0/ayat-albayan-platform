import { SETTING_FIELD_OF, settingDef } from '@ab/shared';
import { flag } from '@/features/platform/settings/registry-form/settings-form';
import { useValues } from '@/features/platform/settings/values/values-context';
import { ChoiceEditor } from './ChoiceEditor';
import type { EditorProps } from './editor-props';
import { NumberEditor } from './NumberEditor';
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
      onChange={(on) => (sheet ? api.drafts.edit(settingKey, { [field]: on }) : api.apply(settingKey, { [field]: on }))}
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

function Control(props: EditorProps) {
  const def = settingDef(props.settingKey);
  switch (def.type) {
    case 'bool':
      return <BoolEditor {...props} />;
    case 'int':
    case 'int_list':
      return <NumberEditor {...props} />;
    case 'enum':
    case 'currency':
    case 'tz':
      return <ChoiceEditor {...props} />;
    case 'json':
      return props.sheet ? <SheetShape {...props} /> : <ShapeEditor {...props} />;
    default:
      return <TextEditor {...props} />;
  }
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
