import type { AcademySettings, SettingKey } from '@ab/shared';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { InsetGroup } from '@/core/ui/surface/inset';
import { useSavingKeys } from '../hooks/use-save-value';
import { editorOf } from '../lib/value-draft';
import { labelOf, valueText } from '../lib/value-text';
import { ValueRow } from './ValueRow';

export interface ValuesTableProps {
  keys: readonly SettingKey[];
  settings: AcademySettings;
  canWrite: boolean;
  onOpen: (key: SettingKey) => void;
}

/**
 * The two-column frame (الاسم | القيمة): a header hidden from screen readers (each row says both) over
 * the rows' one inset card (owner 2026-10-28: one container rule), the heads aligned with the cells.
 */
export function TableFrame({ children }: { children: ReactNode }) {
  const { color } = useTheme();
  const head = {
    fontFamily: type.ui[600],
    fontSize: type.size.xs,
    lineHeight: type.lineHeight(type.size.xs),
    color: color.ink2,
  };
  return (
    <View style={{ gap: 4 }}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flexDirection: 'row', paddingHorizontal: 16 }}
      >
        <AppText style={{ ...head, flex: 1 }}>{t.mobileValues.name}</AppText>
        <AppText style={head}>{t.mobileValues.value}</AppText>
      </View>
      <InsetGroup>{children}</InsetGroup>
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
