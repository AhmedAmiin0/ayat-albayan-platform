import { t, BackButton, Screen, ScreenHeader, KeyboardScroll } from '@ab/mobile-kit';
import { CreateUserForm } from '@/users/create/CreateUserForm';
import { backToUsers } from '@/users/shared/nav';

/** Shown with users.write; the API checks it too. */
export function CreateUserScreen() {
  return (
    <Screen>
      <KeyboardScroll
        style={{ flex: 1, marginHorizontal: -16 }}
        contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingBottom: 32 }}
      >
        <ScreenHeader
          title={t.users.create.title}
          leading={<BackButton onPress={backToUsers} />}
        />
        <CreateUserForm onClose={backToUsers} />
      </KeyboardScroll>
    </Screen>
  );
}
