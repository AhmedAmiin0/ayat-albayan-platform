import { ThreadsList } from '@/inbox/ThreadsList';
import { Screen } from '@/ui/Screen';

/**
 * The teacher's «المحادثات» (R-TCH-03, R-MSG-05): the shared thread list in teacher mode — the
 * guardians of the students she teaches and her own chat with the academy, no leads.
 */
export function TeacherChatsScreen() {
  return (
    <Screen list>
      <ThreadsList />
    </Screen>
  );
}
