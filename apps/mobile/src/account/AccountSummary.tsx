import type { AccountProfile } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { roleLabel } from './queries';

/** Who is signed in (R-ACC-01): the role, and that the name families see is the admin's to change. */
export function AccountSummary({ profile }: { profile: AccountProfile }) {
  const { color } = useTheme();
  const role = roleLabel(profile);
  return (
    <View style={{ gap: 4 }}>
      {role ? (
        <AppText
          style={{
            fontFamily: type.ui[600],
            fontSize: type.size.sm,
            lineHeight: type.lineHeight(type.size.sm),
            color: color.ink,
          }}
        >
          {t.account.role.replace('{role}', role)}
        </AppText>
      ) : null}
      <AppText
        style={{
          fontFamily: type.ui[400],
          fontSize: type.size.xs,
          lineHeight: type.lineHeight(type.size.xs),
          color: color.ink2,
        }}
      >
        {t.account.adminManagedHint}
      </AppText>
    </View>
  );
}
