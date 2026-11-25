import type { CustomConfigView } from '@ab/settings';
import { useId } from 'react';
import { formatDateTime } from '@/features/sales/leads';
import { t, useClock } from '@ab/web-kit';
import { DefaultCell } from '@/features/platform/settings/values/cells/InfoCells';
import { keyItem } from '@/features/platform/settings/values/cells/key-item';
import { NameCell } from '@/features/platform/settings/values/cells/NameCell';
import { RowMenu } from '@/features/platform/settings/values/sheet/RowMenu';
import { cellClass, headClass, rowClass } from './row-classes';

const c = t.config.custom;
const v = t.settingsValues;

export interface CustomValueRowProps {
  entry: CustomConfigView;
  canWrite: boolean;
  onEdit: (entry: CustomConfigView) => void;
  onDelete: (entry: CustomConfigView) => void;
  announce: (message: string) => void;
  groupName?: string | undefined;
  phone?: boolean;
}

/** The value as one LTR line (JSON), cut at 80 characters. */
export function customPreview(entry: CustomConfigView): string {
  const text = typeof entry.value === 'string' ? entry.value : JSON.stringify(entry.value);
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

/** Read-only rows get no menu. */
export function CustomValueRow({ entry, canWrite, onEdit, onDelete, announce, groupName, phone }: CustomValueRowProps) {
  const clock = useClock();
  const labelId = useId();
  const label = entry.description ?? entry.key;
  const value = (
    <bdi dir="ltr" className="block truncate text-sm text-ink tabular-nums">
      {customPreview(entry)}
    </bdi>
  );
  const name = <NameCell label={label} labelId={labelId} isPublic={entry.isPublic} groupName={groupName} />;
  const menu = canWrite && (
    <RowMenu
      label={v.menu.replace('{name}', label)}
      items={[
        { id: 'edit', label: c.edit, onSelect: () => onEdit(entry) },
        { id: 'delete', label: v.customDelete, danger: true, onSelect: () => onDelete(entry) },
        keyItem(entry.key, announce),
      ]}
    />
  );
  return (
    <tr className={rowClass(false)}>
      <th scope="row" abbr={label} className={headClass(false)}>
        {name}
      </th>
      <td className={cellClass}>
        {phone ? (
          <span className="flex items-center justify-between gap-2">
            <span className="min-w-0">{value}</span>
            {menu}
          </span>
        ) : (
          value
        )}
      </td>
      {!phone && (
        <>
          <td className={cellClass}>
            <DefaultCell text="—" />
          </td>
          <td className={cellClass}>
            <small className="text-xs text-ink-2">{formatDateTime(entry.updatedAt, clock)}</small>
          </td>
          <td className={cellClass}>{menu}</td>
        </>
      )}
    </tr>
  );
}
