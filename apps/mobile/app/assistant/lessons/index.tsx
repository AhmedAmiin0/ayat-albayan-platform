import { usePermissions } from '@/auth/use-permissions';
import { AssistantHomeScreen } from '@/assistant-app/AssistantHomeScreen';

export default function AssistantLessonsRoute() {
  return <AssistantHomeScreen can={usePermissions()} />;
}
