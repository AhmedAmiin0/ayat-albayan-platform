import type { SettingKey } from '@ab/shared';
import { settingText } from '@/components/settings/setting-text';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { defaultForm, isModified } from '../../registry-form/row-form';
import { RowMenu, type RowMenuItem } from '../RowMenu';
import { useValues } from '../values-context';
import { keyItem } from './key-item';

const v = t.settingsValues;

/**
 * «إجراء» of an editable settings row: «جارٍ الحفظ…» while saving; «حفظ» + «تراجع» while dirty
 * («حفظ» is aria-disabled while the value is invalid); otherwise the «⋯» menu. Nothing when read-only.
 */
export function ActionCell({ settingKey }: { settingKey: SettingKey }) {
  const api = useValues();
  const name = settingText(settingKey).label;
  if (!api.canWrite) return null;
  if (api.status(settingKey).state === 'saving') {
    return (
      <span role="status" className="text-xs font-semibold text-ink-2">
        {v.saving}
      </span>
    );
  }
  if (api.drafts.dirty(settingKey)) {
    const invalid = api.error(settingKey) !== undefined;
    return (
      <span className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="secondary" aria-disabled={invalid || undefined} onClick={() => !invalid && api.save(settingKey)}>
          {t.common.save}
          <span className="sr-only">: {name}</span>
        </Button>
        <Button size="sm" variant="ghost" onClick={() => api.drafts.discard(settingKey)}>
          {v.undo}
          <span className="sr-only">: {name}</span>
        </Button>
      </span>
    );
  }
  const items: RowMenuItem[] = [];
  if (isModified(settingKey, api.settings)) {
    items.push({ id: 'reset', label: v.resetDefault, onSelect: () => api.apply(settingKey, defaultForm(settingKey)) });
  }
  items.push(keyItem(settingKey, api.announce));
  return <RowMenu label={v.menu.replace('{name}', name)} items={items} />;
}
