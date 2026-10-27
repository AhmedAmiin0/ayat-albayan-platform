import type { UserDetail } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { lastSignIn, recordText, statusStyle } from '../shared/format';
import { useClockCycle } from '@/core/lib/clock';

/** Status (and why it is disabled), the linked record and the last sign-in, above the edit fields. */
export function UserSummary({ user }: { user: UserDetail }) {
  const cycle = useClockCycle();
  const { color } = useTheme();
  const label = { fontFamily: type.ui[600], fontSize: type.size.xs, color: color.ink3 };
  const value = { fontFamily: type.ui[400], fontSize: type.size.sm, color: color.ink2 };
  const disabled = user.status === 'disabled';
  const linked = user.linked ? `${t.users.kinds[user.linked.kind]}: ${recordText(user.linked)}` : t.users.link.none;
  return (
    <View style={{ gap: 8, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: color.rule }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <AppText style={label}>{t.users.detail.status}</AppText>
        <StatusChip {...statusStyle(user.status)} label={t.users.status[user.status]} />
      </View>
      {disabled && user.disabled_reason ? (
        <AppText style={value}>{t.users.detail.disabledReason.replace('{reason}', user.disabled_reason)}</AppText>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <AppText style={label}>{t.users.link.label}</AppText>
        <AppText style={value}>{linked}</AppText>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <AppText style={label}>{t.users.cols.lastSignIn}</AppText>
        <AppText style={value}>{lastSignIn(user.last_sign_in_at, cycle)}</AppText>
      </View>
    </View>
  );
}
