import type { GoogleSyncSettings } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { DefaultCell, LastCell } from '../cells/InfoCells';
import { keyItem } from '../cells/key-item';
import { NameCell } from '../cells/NameCell';
import { useRowIds } from '../editors/editor-props';
import { describeItem, rowDescription } from '../description/row-description';
import { RowMenu } from '../sheet/RowMenu';
import { GOOGLE_DEFAULTS, rowKey, rowWords, type GoogleField } from '../lib/value-rows';
import { useValues } from '../values-context';
import { OwnedValue } from './OwnedValue';
import { cellClass, headClass, rowClass } from './row-classes';

const gs = t.googleSync.switches;

/** A Google value as words («مفعّلة», «تجربة بدون كتابة», «60 يومًا»); «—» before the status loads. */
export function googleText(field: GoogleField, s: GoogleSyncSettings | undefined): string {
  if (!s) return '—';
  if (field === 'enabled') return s.enabled ? gs.on : gs.off;
  if (field === 'mode') return s.mode === 'live' ? gs.live : gs.dryRun;
  return t.settingsValues.units.days.other.replace('{n}', String(s.window_days));
}

export interface GoogleValueRowProps {
  field: GoogleField;
  google: GoogleSyncSettings | undefined;
  groupName?: string | undefined;
  phone?: boolean;
}

/** One of «مزامنة Google»'s three values: read-only here, edited on /admin/settings/google. */
export function GoogleValueRow({ field, google, groupName, phone }: GoogleValueRowProps) {
  const api = useValues();
  const ids = useRowIds();
  const row = { kind: 'google', field, group: 'google' } as const;
  const words = rowWords(row);
  const target = { key: rowKey(row), label: words.label, hintKey: api.entry(rowKey(row))?.hintKey ?? null };
  const value = <OwnedValue text={googleText(field, google)} group="google" />;
  const name = (
    <NameCell
      label={words.label}
      labelId={ids.label}
      hint={phone ? undefined : rowDescription(api, target, words.hint)}
      onDescribe={() => api.describe(target)}
      isPublic={false}
      groupName={groupName}
    />
  );
  if (phone) {
    return (
      <tr className={rowClass(false)}>
        <th scope="row" abbr={words.label} className={headClass(false)}>
          {name}
        </th>
        <td className={cellClass}>{value}</td>
      </tr>
    );
  }
  return (
    <tr className={rowClass(false)}>
      <th scope="row" abbr={words.label} className={headClass(false)}>
        {name}
      </th>
      <td className={cellClass}>{value}</td>
      <td className={cellClass}>
        <DefaultCell text={googleText(field, GOOGLE_DEFAULTS)} />
      </td>
      <td className={cellClass}>
        <LastCell meta={api.meta[rowKey(row)]} />
      </td>
      <td className={cellClass}>
        {api.canWrite && <RowMenu label={t.settingsValues.menu.replace('{name}', words.label)} items={[describeItem(api, target), keyItem(rowKey(row), api.announce)]} />}
      </td>
    </tr>
  );
}
