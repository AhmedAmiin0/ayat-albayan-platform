import type { SettingKey, SettingMeta } from '@ab/shared';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { SheetNotes, SheetNotice } from './SheetNotes';
import { SheetQuestion } from './SheetQuestion';
import { ValueEditor } from './ValueEditor';
import { editorOf } from './value-draft';
import { hintOf, labelOf, valueText } from './value-text';
import type { ValueSheetState } from './use-value-sheet';

export interface ValueSheetBodyProps {
  valueKey: SettingKey;
  saved: unknown;
  /** settings.write held: scalars get an editor. */
  canWrite: boolean;
  meta: SettingMeta | undefined;
  sheet: ValueSheetState;
}

/** The value as text when there is no editor. */
function SavedText({ valueKey, saved }: { valueKey: SettingKey; saved: unknown }) {
  const { color } = useTheme();
  return (
    <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.base, color: color.ink }}>
      {valueText(valueKey, saved)}
    </AppText>
  );
}

/** «إلغاء» then «احفظ» (primary), as every sheet and dialog on the web (docs/26b §7b). */
function Actions({ sheet }: { sheet: ValueSheetState }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <View style={{ flex: 1 }}>
        <Button variant="ghost" label={t.config.custom.cancel} onPress={sheet.requestClose} />
      </View>
      <View style={{ flex: 1 }}>
        <Button label={t.config.custom.save} busy={sheet.saving} onPress={sheet.submit} />
      </View>
    </View>
  );
}

/** The sheet's content (docs/26b §2 phone): title, description, editor, bounds, default, last change, actions. */
export function ValueSheetBody({ valueKey, saved, canWrite, meta, sheet }: ValueSheetBodyProps) {
  const editable = canWrite && editorOf(valueKey) !== 'readonly';
  const hint = hintOf(valueKey);
  return (
    <View style={{ gap: 12 }}>
      <ScreenHeader
        size="h2"
        title={labelOf(valueKey)}
        trailing={<Button variant="ghost" label={t.common.close} onPress={sheet.requestClose} />}
      />
      {hint ? <Note>{hint}</Note> : null}
      {editable ? (
        <ValueEditor valueKey={valueKey} draft={sheet.draft} setDraft={sheet.setDraft} />
      ) : (
        <SavedText valueKey={valueKey} saved={saved} />
      )}
      {sheet.error ? <ErrorLine message={sheet.error} /> : null}
      <SheetNotes
        valueKey={valueKey}
        saved={saved}
        editable={editable}
        canWrite={canWrite}
        meta={meta}
        onReset={sheet.resetDefault}
      />
      <SheetNotice notice={sheet.notice} />
      <SheetQuestion valueKey={valueKey} sheet={sheet} />
      {editable && sheet.stage === 'edit' ? <Actions sheet={sheet} /> : null}
    </View>
  );
}
