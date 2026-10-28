import type { StripeSecretState } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Field } from '@/core/ui/form/Field';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorLine } from '@/inbox';
import { Note } from '@/more';
import { fill } from '@/sales';

const S = t.paymentLinks.settings;

interface SecretInputProps {
  label: string;
  state: StripeSecretState;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  error: string | null;
  busy: boolean;
}

/** A write-only secret: the masked saved value («محفوظ: rk_test_••••abcd»), a hidden input, «حذف». */
export function SecretInput(p: SecretInputProps) {
  return (
    <View style={{ gap: 6 }}>
      <Field
        label={p.label}
        ltr
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        value={p.value}
        onChangeText={p.onChange}
      />
      <Note>{p.state.set && p.state.masked ? fill(S.set, { masked: p.state.masked }) : S.notSet}</Note>
      {p.state.set ? <Button variant="ghost" label={S.clear} accessibilityLabel={`${S.clear} — ${p.label}`} onPress={p.onClear} disabled={p.busy} /> : null}
      {p.error ? <ErrorLine message={p.error} /> : null}
    </View>
  );
}
