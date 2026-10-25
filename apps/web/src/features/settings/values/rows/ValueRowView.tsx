import type { GoogleSyncSettings, SettingKey } from '@ab/shared';
import { CustomValueRow } from './CustomValueRow';
import type { CustomValues } from '@/features/custom-config/use-custom-values';
import { groupLabel } from '../lib/value-groups-view';
import type { ValueRow } from '../lib/value-rows';
import { useValues } from '../values-context';
import { GoogleValueRow } from './GoogleValueRow';
import { SettingPhoneRow } from './SettingPhoneRow';
import { SettingValueRow } from './SettingValueRow';

export interface RowEnv {
  phone: boolean;
  /** «الكل»: name each row's group under its label. */
  showGroup: boolean;
  google: GoogleSyncSettings | undefined;
  custom: CustomValues;
  onOpen: (key: SettingKey) => void;
}

/** One row of the table, drawn by kind (settings, Google, custom) and width (desktop, phone). */
export function ValueRowView({ row, env }: { row: ValueRow; env: RowEnv }) {
  const api = useValues();
  const groupName = env.showGroup ? groupLabel(row.group) : undefined;
  if (row.kind === 'google') return <GoogleValueRow field={row.field} google={env.google} groupName={groupName} phone={env.phone} />;
  if (row.kind === 'custom') {
    return (
      <CustomValueRow
        entry={row.entry}
        canWrite={api.canWrite}
        onEdit={env.custom.edit}
        onDelete={env.custom.askDelete}
        announce={api.announce}
        groupName={groupName}
        phone={env.phone}
      />
    );
  }
  if (env.phone) return <SettingPhoneRow settingKey={row.key} group={row.group} groupName={groupName} onOpen={env.onOpen} />;
  return <SettingValueRow settingKey={row.key} group={row.group} groupName={groupName} />;
}
