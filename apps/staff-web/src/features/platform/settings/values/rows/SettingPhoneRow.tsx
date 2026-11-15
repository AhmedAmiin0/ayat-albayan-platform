import { VALUE_CONFIRM, type SettingKey } from '@ab/shared';
import { settingText } from '@/components/settings/search/setting-text';
import { Icon } from '@/components/ui/display/icon';
import { t } from '@/lib/i18n/i18n';
import { rowValue } from '@/features/platform/settings/registry-form/row-form';
import { NameCell } from '@/features/platform/settings/values/cells/NameCell';
import { conflictBy } from '@/features/platform/settings/values/conflicts/conflict-text';
import { useRowIds } from '@/features/platform/settings/values/editors/editor-props';
import { valueText } from '@/features/platform/settings/values/lib/value-format';
import { isOwnedGroup, type ValuesGroupId } from '@/features/platform/settings/values/lib/value-groups-view';
import type { RowStatus } from '@/features/platform/settings/values/hooks/use-row-saves';
import { useValues } from '@/features/platform/settings/values/values-context';
import { OwnedValue } from './OwnedValue';
import { cellClass, headClass, rowClass } from './row-classes';

const v = t.settingsValues;

export interface SettingPhoneRowProps {
  settingKey: SettingKey;
  group: ValuesGroupId;
  groupName?: string | undefined;
  onOpen: (key: SettingKey) => void;
}

/** The row's small second line: saving, a newer value (conflict), moved, or «يحذف بيانات»; else none. */
export function secondLine(key: SettingKey, s: RowStatus): string | null {
  if (s.state === 'saving') return v.saving;
  if (s.state === 'conflict') return v.conflict.phoneLine.replace('{name}', conflictBy(s.conflict));
  if (s.state === 'moved') return v.moved;
  return VALUE_CONFIRM[key] === 'typed' ? v.tags.deletes : null;
}

/** The value button's name: «عدّل «الاسم»: القيمة», or «الاسم: القيمة» where nothing can be changed. */
export function phoneRowName(input: { label: string; text: string; editable: boolean }): string {
  return input.editable ? `${v.sheet.edit.replace('{name}', input.label)}: ${input.text}` : `${input.label}: ${input.text}`;
}

/**
 * The phone row (docs/26b §2 «Phone»): الاسم | القيمة, the value cell one 44px button (value +
 * chevron) that opens the bottom sheet; a tap anywhere on the row opens it too (the button stays
 * the one control for keyboards and screen readers). A second line only for «جارٍ الحفظ…»,
 * «قيمة أحدث من …» (a conflict), «يحذف بيانات» or «تُدار من صفحة أخرى».
 */
export function SettingPhoneRow({ settingKey, group, groupName, onOpen }: SettingPhoneRowProps) {
  const api = useValues();
  const ids = useRowIds();
  const label = settingText(settingKey).label;
  const full = api.status(settingKey);
  const status = full.state;
  const text = valueText(settingKey, rowValue(settingKey, api.drafts.form(settingKey)));
  const saving = status === 'saving';
  const second = secondLine(settingKey, full);
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
