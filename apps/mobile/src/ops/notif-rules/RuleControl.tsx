import { Switch, View } from 'react-native';
import { t } from '@/lib/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import type { RowControl } from './rule-words';

export interface RuleControlProps {
  control: RowControl;
  /** The row's name: the switch is announced as «تشغيل «…»». */
  name: string;
  busy: boolean;
  onChange: (next: boolean) => void;
}

/**
 * The row's end: an on/off switch (a 44pt target, named by the row), «لا يمكن إيقافه» for a locked
 * row, or nothing (read-only, manual rows, an older API). The switch shows the saved state: a
 * question or a failed save leaves it where it was.
 */
export function RuleControl({ control, name, busy, onChange }: RuleControlProps) {
  const { color } = useTheme();
  if (control.kind === 'none') return null;
  if (control.kind === 'locked') {
    return (
      <AppText style={{ fontFamily: type.ui[500], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs), color: color.ink2 }}>
        {t.mobileNotificationRules.locked}
      </AppText>
    );
  }
  return (
    <View style={{ minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end' }}>
      <Switch
        accessibilityLabel={t.mobileNotificationRules.switchLabel.replace('{name}', name)}
        accessibilityState={{ checked: control.enabled, busy, disabled: busy }}
        value={control.enabled}
        disabled={busy}
        onValueChange={onChange}
      />
    </View>
  );
}
