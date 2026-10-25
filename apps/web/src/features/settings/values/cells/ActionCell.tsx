import type { SettingKey } from '@ab/shared';
import { settingText } from '@/components/settings/setting-text';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n';
import { defaultForm, isModified, rowForm } from '../../registry-form/row-form';
import { isDirty } from '../../registry-form/settings-dirty';
import { describeItem, settingTarget } from '../row-description';
import { RowMenu, type RowMenuItem } from '../RowMenu';
import { valueText } from '../value-format';
import type { ValuesApi } from '../use-values-controller';
import { useValues } from '../values-context';
import { keyItem } from './key-item';

const v = t.settingsValues;

/** «حفظ: الاسم»: the visible word first, then the row (an aria-label, so every browser reads it alike). */
export const rowActionName = (word: string, name: string): string => `${word}: ${name}`;

/** The «⋯» items: the description, the default, the value the last save replaced (same checks and confirmation), the key. */
export function rowMenuItems(api: ValuesApi, key: SettingKey): RowMenuItem[] {
  const items: RowMenuItem[] = [describeItem(api, settingTarget(key))];
  if (isModified(key, api.settings)) items.push({ id: 'reset', label: v.resetDefault, onSelect: () => api.apply(key, defaultForm(key)) });
  const prev = api.previous(key);
  if (prev && isDirty(key, rowForm(key, prev.value), rowForm(key, api.settings[key]))) {
    items.push({
      id: 'previous',
      label: v.restorePrevious,
      detail: valueText(key, prev.value),
      onSelect: () => api.apply(key, rowForm(key, prev.value)),
    });
  }
  items.push(keyItem(key, api.announce));
  return items;
}

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
      <span role="status" className="text-xs font-semibold whitespace-nowrap text-ink-2">
        {v.saving}
      </span>
    );
  }
  if (api.drafts.dirty(settingKey)) {
    const invalid = api.error(settingKey) !== undefined;
    return (
      <span className="flex flex-wrap gap-1.5">
        <Button
          size="sm"
          variant="secondary"
          aria-label={rowActionName(t.common.save, name)}
          aria-disabled={invalid || undefined}
          onClick={() => !invalid && api.save(settingKey)}
        >
          {t.common.save}
        </Button>
        <Button size="sm" variant="ghost" aria-label={rowActionName(v.undo, name)} onClick={() => api.drafts.discard(settingKey)}>
          {v.undo}
        </Button>
      </span>
    );
  }
  return <RowMenu label={v.menu.replace('{name}', name)} items={rowMenuItems(api, settingKey)} />;
}
