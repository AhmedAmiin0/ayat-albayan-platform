import { usePermissions } from '@ab/mobile-kit';
import { AssistantHomeScreen } from '@/assistant-app';

export default function AssistantLessonsRoute() {
  return <AssistantHomeScreen can={usePermissions()} />;
}
