import { settingDef, VALUE_CONFIRM, type SettingKey } from '@ab/shared';
import { StatusChip } from '@/components/ui/status-chip';
import { t } from '@/lib/i18n';

const tags = t.settingsValues.tags;

export interface NameCellProps {
  label: string;
  labelId: string;
  hint?: string | undefined;
  /** The registry tags (public, asks first, deletes data) of a settings row. */
  settingKey?: SettingKey;
  modified?: boolean;
  isPublic?: boolean;
  /** «الكل» results: the group name under the label. */
  groupName?: string | undefined;
}

/** «الاسم»: the label, its tags, and one muted, truncated line (today's hint; full text in the title). */
export function NameCell({ label, labelId, hint, settingKey, modified, isPublic, groupName }: NameCellProps) {
  const confirm = settingKey ? VALUE_CONFIRM[settingKey] : undefined;
  const shown = isPublic ?? (settingKey ? settingDef(settingKey).public === true : false);
  return (
    <div className="grid min-w-0 gap-0.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span id={labelId} className="text-sm font-semibold text-ink">
          {label}
        </span>
        {shown && <StatusChip size="sm" tone="neutral" glyph="hollow" label={tags.public} />}
        {confirm === 'plain' && <StatusChip size="sm" tone="act" glyph="hollow" label={tags.confirm} />}
        {confirm === 'typed' && <StatusChip size="sm" tone="bad" glyph="struck" label={tags.deletes} />}
        {modified && <StatusChip size="sm" tone="ok" glyph="half" label={tags.modified} />}
      </div>
      {groupName && <span className="text-2xs font-semibold text-ink-2">{groupName}</span>}
      {hint && (
        <p title={hint} className="truncate text-xs font-normal text-ink-3">
          {hint}
        </p>
      )}
    </div>
  );
}
