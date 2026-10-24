import type { ReactNode } from 'react';
import { ThreadModeProvider } from '@/inbox/thread-mode';
import { NotLinkedScreen } from './NotLinkedScreen';
import { isNotLinked, useTeacherMe } from './queries';

/**
 * What every teacher screen runs inside, her tabs and her chat above them ((teacher-chat)): the
 * shared chat screens in teacher mode (her threads, no admin actions). A login with no teachers row
 * (404 `teacher_not_linked`) gets one screen that says so, and sign-out.
 */
export function TeacherScope({ children }: { children: ReactNode }) {
  const me = useTeacherMe();
  if (!me.data && isNotLinked(me.error)) return <NotLinkedScreen />;
  return (
    <ThreadModeProvider value={{ kind: 'teacher', teacherId: me.data?.id ?? '' }}>
      {children}
    </ThreadModeProvider>
  );
}
