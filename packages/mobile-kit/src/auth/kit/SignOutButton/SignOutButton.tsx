import { useState } from 'react';
import { View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { signOutDevice } from '../../../lib/session/sign-out';
import { Button } from '../../../ui/primitives/Button';

/** On success the auth gate unmounts the signed-in tree and shows /login. */
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
