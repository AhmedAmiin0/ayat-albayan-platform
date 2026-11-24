import { useState } from 'react';
import { LinkRow } from '@ab/web-kit/auth/login/LinkRow';
import { StatusNote } from '@ab/web-kit/auth/login/StatusNote';
import { ResetFlow } from '@ab/web-kit/auth/reset/ResetFlow';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { StudentPasswordForm } from './StudentPasswordForm';

type View = 'password' | 'firstTime' | 'forgot';

/** First-password and reset use a WhatsApp code to the guardian; both hide while codes are off. */
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
