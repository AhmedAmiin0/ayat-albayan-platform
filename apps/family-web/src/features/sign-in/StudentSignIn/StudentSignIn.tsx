import { LinkRow, StatusNote, ResetFlow, t } from '@ab/web-kit';
import { StudentPasswordForm } from '@/features/sign-in/StudentPasswordForm';
import type { StudentSignInProps } from './StudentSignIn.types';
import { useStudentSignIn } from './use-student-sign-in';

/** First-password and reset use a WhatsApp code to the guardian; both hide while codes are off. */
export function StudentSignIn({ codes }: StudentSignInProps) {
  const { view, saved, done, links } = useStudentSignIn();
  if (view !== 'password') return <ResetFlow key={view} mode={view} onDone={done} />;
  return (
    <div className="grid gap-[22px]">
      {saved && <StatusNote>{t.familyAuth.passwordSaved}</StatusNote>}
      <StudentPasswordForm>{codes && <LinkRow links={links} />}</StudentPasswordForm>
    </div>
  );
}
