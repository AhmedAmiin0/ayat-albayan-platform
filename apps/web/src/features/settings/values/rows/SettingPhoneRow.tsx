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

/** The value button's name: «عدّل «الاسم»: القيمة», or «الاسم: القيمة» where nothing can be changed. */
export function phoneRowName(input: { label: string; text: string; editable: boolean }): string {
  return input.editable ? `${v.sheet.edit.replace('{name}', input.label)}: ${input.text}` : `${input.label}: ${input.text}`;
}

/**
 * The phone row (docs/26b §2 «Phone»): الاسم | القيمة, the value cell one 44px button (value +
 * chevron) that opens the bottom sheet; a tap anywhere on the row opens it too (the button stays
 * the one control for keyboards and screen readers). A second line only for «جارٍ الحفظ…»,
 * «يحذف بيانات» or «تُدار من صفحة أخرى».
 */
export function SettingPhoneRow({ settingKey, group, groupName, onOpen }: SettingPhoneRowProps) {
  const api = useValues();
  const ids = useRowIds();
  const label = settingText(settingKey).label;
  const status = api.status(settingKey).state;
  const text = valueText(settingKey, rowValue(settingKey, api.drafts.form(settingKey)));
  const saving = status === 'saving';
  const second = saving ? v.saving : status === 'moved' ? v.moved : VALUE_CONFIRM[settingKey] === 'typed' ? v.tags.deletes : null;
  const owned = isOwnedGroup(group);
  const editable = api.canWrite && status !== 'moved';
  return (
    <tr
      aria-busy={saving || undefined}
      className={`${rowClass(false)} ${owned ? '' : 'cursor-pointer'}`}
      onClick={owned ? undefined : () => onOpen(settingKey)}
    >
      <th scope="row" abbr={label} className={headClass(false)}>
        <NameCell label={label} labelId={ids.label} groupName={groupName} />
      </th>
      <td className={cellClass}>
        {owned ? (
          <OwnedValue text={valueText(settingKey, api.settings[settingKey])} group={group} />
        ) : (
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label={phoneRowName({ label, text, editable })}
            onClick={(e) => {
              e.stopPropagation();
              onOpen(settingKey);
            }}
            className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md text-start text-sm text-ink"
          >
            <span className="grid min-w-0">
              <span className="break-words">{text}</span>
              {second && <small className="text-2xs text-ink-3">{second}</small>}
            </span>
            <Icon name="chevron-left" className="shrink-0 text-ink-3" />
          </button>
        )}
      </td>
    </tr>
  );
}
