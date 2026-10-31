import { isEditableValueKey, SETTING_DEFAULTS, VALUE_CONFIRM, type SettingKey, type SettingMeta } from '@ab/shared';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { Button } from '@/core/ui/primitives/Button';
import { formatAt } from '@/ops/activity/activity-format';
import { DevKey } from './DevKey';
import { sameValue } from '@/ops/values/lib/value-draft';
import { boundsOf, valueText } from '@/ops/values/lib/value-text';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import type { ClockCycle } from '@ab/shared';

interface SheetNotesProps {
  valueKey: SettingKey;
  /** The value GET /settings holds now. */
  saved: unknown;
  editable: boolean;
  canWrite: boolean;
  meta: SettingMeta | undefined;
  /** «أعد القيمة الافتراضية»: puts the default into the draft (an editable, changed value only). */
  onReset: () => void;
}

/** «آخر تعديل: …» (with who, when GET /config/meta names them). */
function changedLine(meta: SettingMeta, cycle: ClockCycle, tz: string): string {
  const at = formatAt(meta.updatedAt, cycle, tz);
  const c = t.config;
  return meta.updatedByName ? c.changedBy.replace('{at}', at).replace('{name}', meta.updatedByName) : c.changed.replace('{at}', at);
}

/** Why a value has no editor: owned by a module page, or a multi-field value (both on the web). */
function readOnlyWhy(key: SettingKey, canWrite: boolean): string | undefined {
  if (!isEditableValueKey(key)) return t.mobileValues.owned;
  return canWrite ? t.mobileValues.editOnWeb : undefined;
}

/** The tag of a value «احفظ» asks about first: «يحذف بيانات» or «يُسأل قبل الحفظ». */
function tagOf(key: SettingKey): string | undefined {
  const kind = VALUE_CONFIRM[key];
  if (!kind) return undefined;
  return kind === 'typed' ? t.settingsValues.tags.deletes : t.settingsValues.tags.confirm;
}

/** The small lines under the editor: why read-only, bounds, default (+ reset), last change, tag, key. */
export function SheetNotes({ valueKey, saved, editable, canWrite, meta, onReset }: SheetNotesProps) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const why = editable ? undefined : readOnlyWhy(valueKey, canWrite);
  const bounds = editable ? boundsOf(valueKey) : undefined;
  const fallback = SETTING_DEFAULTS[valueKey];
  const tag = tagOf(valueKey);
  return (
    <>
      {why ? <Note>{why}</Note> : null}
      {bounds ? <Note>{bounds}</Note> : null}
      <Note>{t.mobileValues.defaultValue.replace('{value}', valueText(valueKey, fallback))}</Note>
      {editable && !sameValue(saved, fallback) ? (
        <Button variant="secondary" label={t.settingsValues.resetDefault} onPress={onReset} />
      ) : null}
      {meta ? <Note>{changedLine(meta, cycle, tz)}</Note> : null}
      {tag ? <Note>{tag}</Note> : null}
      <DevKey settingKey={valueKey} />
    </>
  );
}

/** A save's answer: «تُدار من صفحة أخرى» as a note, a failure as an alert. */
export function SheetNotice({ notice }: { notice: string | null }) {
  if (notice === null) return null;
  return notice === t.mobileValues.owned ? <Note>{notice}</Note> : <ErrorLine message={notice} />;
}
