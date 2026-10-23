import { isEditableValueKey, type OwnedValueGroupId, type SettingKey } from '@ab/shared';
import { settingText } from '@/components/settings/setting-text';
import { t } from '@/lib/i18n';
import { isModified } from '../../registry-form/row-form';
import { ActionCell } from '../cells/ActionCell';
import { DefaultCell, LastCell } from '../cells/InfoCells';
import { keyItem } from '../cells/key-item';
import { NameCell } from '../cells/NameCell';
import { useRowIds } from '../editors/editor-props';
import { ValueEditor } from '../editors/ValueEditor';
import { RowMenu } from '../RowMenu';
import { defaultNote, defaultText, valueText } from '../value-format';
import { isOwnedGroup, type ValuesGroupId } from '../value-groups-view';
import { useValues } from '../values-context';
import { OwnedValue } from './OwnedValue';
import { cellClass, headClass, rowClass } from './row-classes';

export interface SettingValueRowProps {
  settingKey: SettingKey;
  group: ValuesGroupId;
  /** «الكل» results name the group under the label. */
  groupName?: string | undefined;
}

/**
 * One settings row on the desktop table: an inline editor for an editable key (and only with
 * settings.write), else the value as text (a module-owned key also links to its page).
 */
export function SettingValueRow({ settingKey, group, groupName }: SettingValueRowProps) {
  const api = useValues();
  const ids = useRowIds();
  const words = settingText(settingKey);
  const owned = isOwnedGroup(group) ? (group as OwnedValueGroupId) : null;
  // The API refused the key as owned by a module page: the row is text from then on.
  const moved = api.status(settingKey).state === 'moved';
  const editable = owned === null && !moved && api.canWrite && isEditableValueKey(settingKey);
  const dirty = editable && api.drafts.dirty(settingKey);
  const stored = valueText(settingKey, api.settings[settingKey]);
  return (
    <tr aria-busy={api.status(settingKey).state === 'saving' || undefined} className={rowClass(dirty)}>
      <th scope="row" abbr={words.label} className={headClass(dirty)}>
        <NameCell
          label={words.label}
          labelId={ids.label}
          hint={words.hint}
          settingKey={settingKey}
          modified={isModified(settingKey, api.settings)}
          groupName={groupName}
        />
      </th>
      <td className={cellClass}>
        {editable ? (
          <ValueEditor settingKey={settingKey} ids={ids} />
        ) : owned ? (
          <OwnedValue text={stored} group={owned} />
        ) : (
          <span className="grid gap-0.5">
            <span className="text-sm text-ink">{stored}</span>
            {moved && <small className="text-xs text-ink-2">{t.settingsValues.moved}</small>}
          </span>
        )}
      </td>
      <td className={cellClass}>
        <DefaultCell text={defaultText(settingKey)} note={defaultNote(settingKey)} noteId={ids.bounds} />
      </td>
      <td className={cellClass}>
        <LastCell meta={api.meta[settingKey]} unsavedWas={dirty ? stored : undefined} />
      </td>
      <td className={cellClass}>
        {editable ? (
          <ActionCell settingKey={settingKey} />
        ) : (
          api.canWrite && (
            <RowMenu label={t.settingsValues.menu.replace('{name}', words.label)} items={[keyItem(settingKey, api.announce)]} />
          )
        )}
      </td>
    </tr>
  );
}
