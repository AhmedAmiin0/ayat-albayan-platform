import { VALUE_CONFIRM, type SettingKey } from '@ab/shared';
import { settingText } from '@/components/settings/setting-text';
import { Icon } from '@/components/ui/icon';
import { t } from '@/lib/i18n';
import { rowValue } from '../../registry-form/row-form';
import { NameCell } from '../cells/NameCell';
import { useRowIds } from '../editors/editor-props';
import { valueText } from '../value-format';
import { isOwnedGroup, type ValuesGroupId } from '../value-groups-view';
import { useValues } from '../values-context';
import { OwnedValue } from './OwnedValue';
import { cellClass, headClass, rowClass } from './row-classes';

const v = t.settingsValues;

export interface SettingPhoneRowProps {
  settingKey: SettingKey;
  group: ValuesGroupId;
  groupName?: string | undefined;
  onOpen: (key: SettingKey) => void;
}

/**
 * The phone row (docs/26b §2 «Phone»): الاسم | القيمة, the value cell one 44px button (value +
 * chevron) that opens the bottom sheet; a second line only for «جارٍ الحفظ…» or «يحذف بيانات».
 */
export function SettingPhoneRow({ settingKey, group, groupName, onOpen }: SettingPhoneRowProps) {
  const api = useValues();
  const ids = useRowIds();
  const label = settingText(settingKey).label;
  const text = valueText(settingKey, rowValue(settingKey, api.drafts.form(settingKey)));
  const saving = api.status(settingKey).state === 'saving';
  const second = saving ? v.saving : VALUE_CONFIRM[settingKey] === 'typed' ? v.tags.deletes : null;
  return (
    <tr aria-busy={saving || undefined} className={rowClass(false)}>
      <th scope="row" abbr={label} className={headClass(false)}>
        <NameCell label={label} labelId={ids.label} groupName={groupName} />
      </th>
      <td className={cellClass}>
        {isOwnedGroup(group) ? (
          <OwnedValue text={valueText(settingKey, api.settings[settingKey])} group={group} />
        ) : (
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => onOpen(settingKey)}
            className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md text-start text-sm text-ink"
          >
            <span className="grid min-w-0">
              <span className="truncate">{text}</span>
              {second && <small className="text-2xs text-ink-3">{second}</small>}
            </span>
            <Icon name="chevron-left" className="shrink-0 text-ink-3" />
            <span className="sr-only">: {v.sheet.edit.replace('{name}', label)}</span>
          </button>
        )}
      </td>
    </tr>
  );
}
