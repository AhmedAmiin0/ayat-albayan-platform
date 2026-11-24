import { CrashScreen } from '@ab/mobile-kit';
import { AccountSetupScreen, useNeedsSetup } from '@/core/auth';
import { usePushRegistration } from '@/core/push/usePushRegistration';
import { TeacherTabs } from '@/teacher';

/** R-MOB-01, R-NOT-01: a WhatsApp-code login completes its account first (docs/46 A4, A8). */
export default function TeacherLayout() {
  usePushRegistration('teacher');
  const setup = useNeedsSetup();
  return setup ? <AccountSetupScreen /> : <TeacherTabs />;
}

export const ErrorBoundary = CrashScreen;
