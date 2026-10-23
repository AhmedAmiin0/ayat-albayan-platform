import { isEditableValueKey, SETTING_DEFAULTS, type SettingKey, type SettingMeta } from '@ab/shared';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { formatAt } from '../activity-format';
import { boundsOf, valueText } from './value-text';

export interface SheetNotesProps {
  valueKey: SettingKey;
  editable: boolean;
  canWrite: boolean;
  meta: SettingMeta | undefined;
}

/** «آخر تعديل: …» (with who, when GET /config/meta names them). */
function changedLine(meta: SettingMeta): string {
  const at = formatAt(meta.updatedAt);
  const c = t.config;
  return meta.updatedByName ? c.changedBy.replace('{at}', at).replace('{name}', meta.updatedByName) : c.changed.replace('{at}', at);
}

/** Why a value has no editor: owned by a module page, or a multi-field value (both on the web). */
function readOnlyWhy(key: SettingKey, canWrite: boolean): string | undefined {
  if (!isEditableValueKey(key)) return t.mobileValues.owned;
  return canWrite ? t.mobileValues.editOnWeb : undefined;
}

/** The small lines under the editor: why it is read-only, bounds, default, last change. */
export function SheetNotes({ valueKey, editable, canWrite, meta }: SheetNotesProps) {
  const why = editable ? undefined : readOnlyWhy(valueKey, canWrite);
  const bounds = editable ? boundsOf(valueKey) : undefined;
  const fallback = valueText(valueKey, SETTING_DEFAULTS[valueKey]);
  return (
    <>
      {why ? <Note>{why}</Note> : null}
      {bounds ? <Note>{bounds}</Note> : null}
      <Note>{t.mobileValues.defaultValue.replace('{value}', fallback)}</Note>
      {meta ? <Note>{changedLine(meta)}</Note> : null}
    </>
  );
}

/** A save's answer: «تُدار من صفحة أخرى» as a note, a failure as an alert. */
export function SheetNotice({ notice }: { notice: string | null }) {
  if (notice === null) return null;
  return notice === t.mobileValues.owned ? <Note>{notice}</Note> : <ErrorLine message={notice} />;
}
