import { ScrollView } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { BackButton } from '@/core/ui/navigation';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { CreateUserForm } from '../create/CreateUserForm';
import { backToUsers } from '../shared/nav';

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
          leading={<BackButton onPress={backToUsers} />}
        />
        <CreateUserForm onClose={backToUsers} />
      </ScrollView>
    </Screen>
  );
}
