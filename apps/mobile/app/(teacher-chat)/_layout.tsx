import { ChatStack } from '@/nav/ChatStack';
import { TeacherScope } from '@/teacher/TeacherScope';

/** The teacher's chat above her tabs: teacher mode and the not-linked gate, as in TeacherTabs. */
export default function TeacherChatLayout() {
  return (
    <TeacherScope>
      <ChatStack />
    </TeacherScope>
  );
}
