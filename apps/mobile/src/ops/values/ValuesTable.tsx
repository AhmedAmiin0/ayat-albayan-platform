import type { AcademySettings, SettingKey } from '@ab/shared';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { useSavingKeys } from './use-save-value';
import { editorOf } from './value-draft';
import { labelOf, valueText } from './value-text';
import { ValueRow } from './ValueRow';

export interface ValuesTableProps {
  keys: readonly SettingKey[];
  settings: AcademySettings;
  canWrite: boolean;
  onOpen: (key: SettingKey) => void;
}

/** The two-column frame (الاسم | القيمة): a header hidden from screen readers (each row says both). */
export function TableFrame({ children }: { children: ReactNode }) {
  const { color } = useTheme();
  const head = {
    fontFamily: type.ui[600],
    fontSize: type.size.xs,
    lineHeight: type.lineHeight(type.size.xs),
    color: color.ink2,
  };
  return (
    <View style={{ marginHorizontal: -16 }}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: color.rule }}
      >
        <AppText style={{ ...head, flex: 1 }}>{t.mobileValues.name}</AppText>
        <AppText style={head}>{t.mobileValues.value}</AppText>
      </View>
      {children}
    </View>
  );
}

/** The selected group as a two-column table (docs/26b §2 phone): name and value, a tap opens the sheet. */
export function ValuesTable({ keys, settings, canWrite, onOpen }: ValuesTableProps) {
  const saving = useSavingKeys();
  return (
    <TableFrame>
      {keys.map((key) => (
        <ValueRow
          key={key}
          label={labelOf(key)}
          value={valueText(key, settings[key])}
          editable={canWrite && editorOf(key) !== 'readonly'}
          saving={saving.includes(key)}
          onPress={() => onOpen(key)}
        />
      ))}
    </TableFrame>
  );
}
