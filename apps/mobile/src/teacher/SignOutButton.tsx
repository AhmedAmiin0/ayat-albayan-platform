import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { signOutDevice } from '@/more/sign-out';
import { Button } from '@/core/ui/primitives/Button';

/** «تسجيل الخروج»: on success the auth gate unmounts the teacher tabs and shows /login. */
export function SignOutButton() {
  const [leaving, setLeaving] = useState(false);
  const logout = () => {
    setLeaving(true);
    void signOutDevice().finally(() => setLeaving(false));
  };
  return (
    <View style={{ alignItems: 'flex-start' }}>
      <Button variant="ghost" label={t.auth.logout} onPress={logout} busy={leaving} />
    </View>
  );
}
