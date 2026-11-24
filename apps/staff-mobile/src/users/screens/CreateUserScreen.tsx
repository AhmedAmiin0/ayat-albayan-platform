import { ScrollView } from 'react-native';
import { t, BackButton, Screen, ScreenHeader } from '@ab/mobile-kit';
import { CreateUserForm } from '@/users/create/CreateUserForm';
import { backToUsers } from '@/users/shared/nav';

/** Shown with users.write; the API checks it too. */
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
