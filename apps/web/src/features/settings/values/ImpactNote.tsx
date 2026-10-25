import { VALUE_CONFIRM, type SettingKey } from '@ab/shared';
import { settingText } from '@/components/settings/search/setting-text';
import { t } from '@/lib/i18n/i18n';
import { Tag } from './cells/NameCell';

const v = t.settingsValues;

/**
 * The phone sheet's impact note for a key that asks before saving: its tag, and what the change
 * does in a sentence (the switch's or the setting's own hint; for retention days, that older data
 * is deleted for good).
 */
export function ImpactNote({ settingKey }: { settingKey: SettingKey }) {
  const confirm = VALUE_CONFIRM[settingKey];
  if (!confirm) return null;
  const words = settingText(settingKey);
  const sentences = [words.toggleHint ?? words.hint, confirm === 'typed' ? v.confirm.typedBody : undefined].filter(Boolean);
  return (
    <div data-impact className="grid gap-1.5 rounded-md border border-rule bg-sunk px-3 py-2.5">
      <span>
        <Tag label={confirm === 'typed' ? v.tags.deletes : v.tags.confirm} />
      </span>
      {sentences.map((s) => (
        <p key={s} className="text-sm text-ink-2">
          {s}
        </p>
      ))}
    </div>
  );
}
