import { View } from 'react-native';
import { type, useTheme } from '../../theme';
import { ErrorLine } from '../../ui/feedback/ErrorLine';
import { Field } from '../../ui/form/Field';
import { AppText } from '../../ui/primitives/AppText';
import type { AccountFieldProps } from './AccountField.types';

/** ui/Field plus its hint and its field-level error (docs/07 §10: 13pt+ cinnabar under it). */
export function AccountField({ error, hint, ...field }: AccountFieldProps) {
  const { color } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <Field {...field} accessibilityHint={error ?? hint} />
      {hint ? (
        <AppText
          style={{
            fontFamily: type.ui[400],
            fontSize: type.size.xs,
            lineHeight: type.lineHeight(type.size.xs),
            color: color.ink3,
          }}
        >
          {hint}
        </AppText>
      ) : null}
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}
