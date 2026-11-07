import { ActivityIndicator } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';

interface SendButtonProps {
  label: string;
  pending: boolean;
  /** The lesson has not started yet: not usable, not busy. */
  disabled: boolean;
  onPress: () => void;
}

const spinner = (color: string) => (
  <ActivityIndicator testID="send-spinner" size="small" color={color} />
);

/** «إرسال التقرير» / «حفظ التعديل»: disabled and spinning while the request is pending. */
export function SendButton({ label, pending, disabled, onPress }: SendButtonProps) {
  return (
    <Button
      label={pending ? t.reports.submitting : label}
      busy={pending}
      disabled={disabled}
      icon={pending ? spinner : undefined}
      onPress={onPress}
    />
  );
}
