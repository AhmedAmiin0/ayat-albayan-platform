import { Switch, View } from 'react-native';
import { t, type, useTheme, AppText } from '@ab/mobile-kit';
import type { RowControl } from '@/ops/notif-rules/lib/rule-words';

interface RuleControlProps {
  control: RowControl;
  name: string;
  busy: boolean;
  onChange: (next: boolean) => void;
}

/** The switch shows the saved state, so a pending question or failed save leaves it unmoved. */
export function RuleControl({ control, name, busy, onChange }: RuleControlProps) {
  const { color } = useTheme();
  if (control.kind === 'none') return null;
  if (control.kind === 'locked') {
    return (
      <AppText
        style={{
          fontFamily: type.ui[500],
          fontSize: type.size.xs,
          lineHeight: type.lineHeight(type.size.xs),
          color: color.ink2,
        }}
      >
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
