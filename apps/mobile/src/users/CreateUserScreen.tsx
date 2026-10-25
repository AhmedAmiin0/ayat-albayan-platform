import { ScrollView } from 'react-native';
import { t } from '@/lib/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { CreateUserForm } from './CreateUserForm';
import { backToUsers } from './nav';

/** «مستخدم جديد» pushed from «المستخدمون» (shown there with users.write; the API checks it too). */
export function CreateUserScreen() {
  return (
    <Screen>
      <ScrollView
        style={{ flex: 1, marginHorizontal: -16 }}
        contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <ScreenHeader
          title={t.users.create.title}
          trailing={<Button variant="ghost" label={t.common.back} onPress={backToUsers} />}
        />
        <CreateUserForm onClose={backToUsers} />
      </ScrollView>
    </Screen>
  );
}
