import { ActivityIndicator, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';
import { StaffPresenceRow } from './StaffPresenceRow';
import { useStaffPresence } from './use-staff-presence';

type Staff = ReturnType<typeof useStaffPresence>;

/** A quiet one-line state: presence off, or no staff yet. */
function QuietLine({ text }: { text: string }) {
  const { color } = useTheme();
  return (
    <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink3 }}>
      {text}
    </AppText>
  );
}

function StaffBody({ staff }: { staff: Staff }) {
  const { color } = useTheme();
  switch (staff.state) {
    case 'loading':
      return <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} />;
    case 'error':
      return <ErrorState message={t.presence.loadError} onRetry={staff.retry} />;
    case 'off':
      return <QuietLine text={t.presence.off} />;
    case 'empty':
      return <QuietLine text={t.presence.staffEmpty} />;
    case 'hidden':
      return null;
    case 'ready':
      return staff.lines.map((line) => (
        <StaffPresenceRow key={line.row.profile_id} line={line} clock={staff.clock} />
      ));
  }
}

/**
 * «حالة الفريق» above the users list (docs/33 §4, admin only): «متصلون الآن: n», then each staff
 * member online first, then by last seen; loading, error, off and empty each say so.
 */
export function StaffPresenceSection() {
  const { color } = useTheme();
  const staff = useStaffPresence();
  if (staff.state === 'hidden') return null;
  return (
    <View testID="staff-presence" style={{ gap: 4, paddingBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <AppText
          accessibilityRole="header"
          style={{ flex: 1, fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink }}
        >
          {t.presence.staffTitle}
        </AppText>
        {staff.state === 'ready' ? (
          <AppText style={{ fontFamily: type.ui[500], fontSize: type.size.xs, color: color.ok }}>
            {t.presence.staffOnline.replace('{n}', String(staff.onlineCount))}
          </AppText>
        ) : null}
      </View>
      <StaffBody staff={staff} />
    </View>
  );
}
