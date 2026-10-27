import { memo, useCallback } from 'react';
import { formatPhone, type UserView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ListRow } from '@/core/ui/layout/ListRow';
import { Ltr, ltr } from '@/core/ui/primitives/Ltr';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { lastSignIn, recordText, roleText, statusStyle } from '../shared/format';
import { useClockCycle } from '@/core/lib/clock';

interface UserItemProps {
  user: UserView;
  /** Stable: opens the user by id. */
  onOpen: (id: string) => void;
}

/** One login, like the web's stacked row: name + status, then role and record, email, username, phone, last sign-in. */
export const UserItem = memo(function UserItem({ user, onOpen }: UserItemProps) {
  const open = useCallback(() => onOpen(user.id), [onOpen, user.id]);
  const cycle = useClockCycle();
  const { color } = useTheme();
  const quiet = { fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink2 };
  const parts = [roleText(user.role), user.linked ? recordText(user.linked) : null];
  return (
    <ListRow
      title={user.full_name}
      subtitle={parts.filter((p): p is string => p !== null).join(t.common.listSeparator)}
      trailing={<StatusChip {...statusStyle(user.status)} label={t.users.status[user.status]} size="sm" />}
      tags={
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 2 }}>
          {user.email ? <Ltr style={quiet}>{user.email}</Ltr> : null}
          {user.username ? <AppText style={quiet}>{`${t.familyAuth.usersColumn}: ${ltr(user.username)}`}</AppText> : null}
          {user.phone_e164 ? <Ltr style={quiet}>{formatPhone(user.phone_e164)}</Ltr> : null}
          <AppText style={quiet}>{`${t.users.cols.lastSignIn}: ${lastSignIn(user.last_sign_in_at, cycle)}`}</AppText>
        </View>
      }
      onPress={open}
    />
  );
});
