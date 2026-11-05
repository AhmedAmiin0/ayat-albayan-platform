import { formatPhone, type FamilyOption } from '@ab/shared';
import { Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { ltr } from '@/core/ui/primitives/Ltr';
import { Note } from '@/more';
import { type, useTheme } from '@/theme';

interface FamilyRowProps {
  family: FamilyOption;
  picked: boolean;
  /** The student's own family: listed, never pickable. */
  current: boolean;
  onPick: () => void;
}

/** One answer of the guardian picker: name, main number and children, a radio. */
export function FamilyRow({ family, picked, current, onPick }: FamilyRowProps) {
  const { color } = useTheme();
  const children = t.peopleEdit.children.replace(
    '{names}',
    family.students.map((s) => s.name).join(t.common.listSeparator),
  );
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: picked, disabled: current }}
      accessibilityLabel={family.name}
      disabled={current}
      onPress={onPick}
      style={{
        borderWidth: picked ? 2 : 1,
        borderColor: picked ? color.lapis : color.ruleInput,
        borderRadius: 10,
        padding: 10,
        opacity: current ? 0.5 : 1,
      }}
    >
      <View style={{ gap: 2 }}>
        <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.body, color: color.ink }}>
          {`${family.name} ${ltr(formatPhone(family.phone_e164))}`}
        </AppText>
        <Note>{children}</Note>
      </View>
    </Pressable>
  );
}
