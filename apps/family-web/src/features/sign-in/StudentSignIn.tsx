import { useState } from 'react';
import { LinkRow, StatusNote, ResetFlow } from '@ab/web-kit/auth';
import { t } from '@ab/web-kit/i18n';
import { StudentPasswordForm } from './StudentPasswordForm';

type View = 'password' | 'firstTime' | 'forgot';

/**
 * The student code + password; «أول دخول؟» sets the first password with a code sent to the
 * guardian's WhatsApp, «نسيت كلمة المرور؟» resets it the same way. Both hide while codes are off.
 */
export function StudentSignIn({ codes }: { codes: boolean }) {
  const [view, setView] = useState<View>('password');
  const [saved, setSaved] = useState(false);
  if (view !== 'password') {
    const done = (ok: boolean) => {
      setSaved(ok);
      setView('password');
    };
    return <ResetFlow key={view} mode={view} onDone={done} />;
  }
  const links = [
    { label: t.familyAuth.firstTime, onClick: () => setView('firstTime') },
    { label: t.familyAuth.forgot, onClick: () => setView('forgot') },
  ];
  return (
    <div className="grid gap-[22px]">
      {saved && <StatusNote>{t.familyAuth.passwordSaved}</StatusNote>}
      <StudentPasswordForm>{codes && <LinkRow links={links} />}</StudentPasswordForm>
    </div>
  );
}
