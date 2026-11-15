import { isEditableValueKey, type OwnedValueGroupId, type SettingKey } from '@ab/shared';
import { settingText } from '@/components/settings/search/setting-text';
import { t } from '@/lib/i18n/i18n';
import { isModified } from '@/features/platform/settings/registry-form/row-form';
import { ActionCell } from '@/features/platform/settings/values/cells/ActionCell';
import { DefaultCell, LastCell } from '@/features/platform/settings/values/cells/InfoCells';
import { keyItem } from '@/features/platform/settings/values/cells/key-item';
import { NameCell } from '@/features/platform/settings/values/cells/NameCell';
import { useRowIds } from '@/features/platform/settings/values/editors/editor-props';
import { ValueEditor } from '@/features/platform/settings/values/editors/ValueEditor';
import { ConflictRow } from '@/features/platform/settings/values/conflicts/ConflictRow';
import { describeItem, rowDescription, settingTarget } from '@/features/platform/settings/values/description/row-description';
import { RowMenu } from '@/features/platform/settings/values/sheet/RowMenu';
import { defaultNote, defaultText, valueText } from '@/features/platform/settings/values/lib/value-format';
import { isOwnedGroup, type ValuesGroupId } from '@/features/platform/settings/values/lib/value-groups-view';
import { useValues } from '@/features/platform/settings/values/values-context';
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
  const target = settingTarget(settingKey);
  return (
    <>
      <tr
        aria-busy={api.status(settingKey).state === 'saving' || undefined}
        className={rowClass(dirty)}
      >
        <th scope="row" abbr={words.label} className={headClass(dirty)}>
          <NameCell
            label={words.label}
            labelId={ids.label}
            hint={rowDescription(api, target, words.hint)}
            onDescribe={() => api.describe(target)}
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
          <DefaultCell
            text={defaultText(settingKey)}
            note={defaultNote(settingKey)}
            noteId={ids.bounds}
          />
        </td>
        <td className={cellClass}>
          <LastCell meta={api.meta[settingKey]} unsavedWas={dirty ? stored : undefined} />
        </td>
        <td className={cellClass}>
          {editable ? (
            <ActionCell settingKey={settingKey} />
          ) : (
            api.canWrite && (
              <RowMenu
                label={t.settingsValues.menu.replace('{name}', words.label)}
                items={[describeItem(api, target), keyItem(settingKey, api.announce)]}
              />
            )
          )}
        </td>
      </tr>
      <ConflictRow settingKey={settingKey} cols={5} />
    </>
  );
}
