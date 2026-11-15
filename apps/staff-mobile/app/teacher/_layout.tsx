import { AccountSetupScreen, useNeedsSetup } from '@/core/auth';
import { usePushRegistration } from '@/core/push/usePushRegistration';
import { TeacherTabs } from '@/teacher';

/**
 * The teacher tree: her tabs, and this device registered for her pushes (R-MOB-01, R-NOT-01). A
 * login made by a WhatsApp code shows «أكمل حسابك» first (docs/46 A4, A8).
 */
export default function TeacherLayout() {
  usePushRegistration('teacher');
  const setup = useNeedsSetup();
  return setup ? <AccountSetupScreen /> : <TeacherTabs />;
}
