import type { SettingKey } from '@ab/shared';
import { ConflictNotice } from './ConflictNotice';
import { useValues } from '@/features/platform/settings/values/values-context';

/** The conflict under its row on the desktop table: one cell spanning every column. */
export function ConflictRow({ settingKey, cols }: { settingKey: SettingKey; cols: number }) {
  const api = useValues();
  if (api.status(settingKey).state !== 'conflict') return null;
  return (
    <tr className="border-b border-rule">
      <td colSpan={cols} className="border-s-[3px] border-s-act py-2 pe-4 ps-2.5">
        <ConflictNotice settingKey={settingKey} />
      </td>
    </tr>
  );
}
