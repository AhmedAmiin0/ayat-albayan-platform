import { ThreadsList } from '@/inbox/threads-list/ThreadsList';
import { Screen } from '@ab/mobile-kit';

/** Teacher mode (R-TCH-03, R-MSG-05): her students' guardians and the academy chat, no leads. */
export function TeacherChatsScreen() {
  return (
    <Screen list>
      <ThreadsList />
    </Screen>
  );
}
