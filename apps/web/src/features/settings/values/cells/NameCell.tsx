import { settingDef, VALUE_CONFIRM, type SettingKey } from '@ab/shared';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { t } from '@/lib/i18n';

const tags = t.settingsValues.tags;

/** A registry tag: plain and neutral (no status colour: a tag describes the value, it is not a state). */
export const tagClass = 'inline-flex h-5 items-center whitespace-nowrap rounded-xs border border-rule-strong px-1.5 text-2xs font-semibold text-ink-2';

export function Tag({ label }: { label: string }) {
  return <span className={tagClass}>{label}</span>;
}

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
  /** The muted line is a button opening «تعديل الوصف» (read it in full, edit it with the right). */
  onDescribe?: (() => void) | undefined;
}

const hintClass = 'truncate text-xs font-normal text-ink-3';

/** The one muted line: a button that opens the description dialog, or plain text. */
function HintLine({ hint, onDescribe }: { hint: string; onDescribe?: (() => void) | undefined }) {
  if (!onDescribe) {
    return (
      <p title={hint} className={hintClass}>
        {hint}
      </p>
    );
  }
  return (
    <button
      type="button"
      title={hint}
      aria-haspopup="dialog"
      onClick={onDescribe}
      className={`${hintClass} min-h-11 max-w-full rounded-xs text-start underline-offset-4 hover:text-ink-2 hover:underline sm:min-h-5`}
    >
      {hint}
    </button>
  );
}

/** «الاسم»: the label, its tags, and one muted, truncated line (the description; full text in the title and its dialog). */
export function NameCell({ label, labelId, hint, settingKey, modified, isPublic, groupName, onDescribe }: NameCellProps) {
  const confirm = settingKey ? VALUE_CONFIRM[settingKey] : undefined;
  const shown = isPublic ?? (settingKey ? settingDef(settingKey).public === true : false);
  return (
    <div className="grid min-w-0 gap-0.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span id={labelId} className="text-sm font-semibold text-ink">
          {label}
        </span>
        {shown && <Tag label={tags.public} />}
        {confirm === 'plain' && <Tag label={tags.confirm} />}
        {confirm === 'typed' && <Tag label={tags.deletes} />}
        {modified && (
          <span className="inline-flex items-center gap-1 text-2xs whitespace-nowrap text-ink-2">
            <NuqtaGlyph shape="half" />
            {tags.modified}
          </span>
        )}
      </div>
      {groupName && <span className="text-2xs font-semibold text-ink-2">{groupName}</span>}
      {hint && <HintLine hint={hint} onDescribe={onDescribe} />}
    </div>
  );
}
