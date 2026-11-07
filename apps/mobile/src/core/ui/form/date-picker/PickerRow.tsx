import { Pressable, View } from 'react-native';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { AppText } from '@/core/ui/primitives/AppText';
import { Chevron } from '@/core/ui/primitives/Chevron';
import { shape, type, useTheme } from '@/theme';
import { FormLabel } from '@/core/ui/form/FormLabel';

interface PickerRowProps {
  label: string;
  /** The shown value, or the placeholder («اختر الساعة») while empty. */
  text: string;
  empty: boolean;
  /** Spoken after the label: what a tap does. */
  hint: string;
  onPress: () => void;
  error?: string | undefined;
  testID: string;
  required?: boolean;
}

/** An input-like row (label, value, chevron) opening a picker: picked, never typed. */
export function PickerRow(props: PickerRowProps) {
  const { label, text, empty, hint, onPress, error, testID, required } = props;
  const { color } = useTheme();
  return (
    <View style={{ gap: 6, flexGrow: 1, flexBasis: 140 }}>
      <FormLabel required={required}>{label}</FormLabel>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${text}`}
        accessibilityHint={hint}
        onPress={onPress}
        style={{
          minHeight: shape.control.touch,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: error ? color.bad : color.ruleInput,
          borderRadius: shape.radius.md,
          backgroundColor: color.raised,
        }}
      >
        <AppText
          style={{
            fontFamily: type.ui[600],
            fontSize: type.size.base,
            color: empty ? color.ink3 : color.ink,
            fontVariant: ['tabular-nums'],
          }}
        >
          {text}
        </AppText>
        <Chevron to="down" color={color.ink2} />
      </Pressable>
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}
