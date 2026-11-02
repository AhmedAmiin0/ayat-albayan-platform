import { usePermissions } from '@/core/auth';
import { AssistantHomeScreen } from '@/assistant-app';

export default function AssistantLessonsRoute() {
  return <AssistantHomeScreen can={usePermissions()} />;
}
