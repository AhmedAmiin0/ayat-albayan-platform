import { useState } from 'react';
import { t } from '@/lib/i18n/i18n';
import { CodesGate } from '../login/CodesGate';
import { LinkRow } from '../login/LinkRow';
import { PasswordForm } from '../login/PasswordForm';
import { StatusNote } from '../login/StatusNote';
import { ResetFlow } from '../reset/ResetFlow';
import { PhoneSignIn } from './PhoneSignIn';

const F = t.familyAuth;
type View = 'phone' | 'username' | 'forgot' | 'firstTime';

/**
 * «الأسرة والطلاب» (docs/30 §1): the guardian by WhatsApp code; a child by student code + password,
 * set at «أول دخول؟». Nothing of it shows while WhatsApp codes are off (docs/30 §4).
 */
export function FamilyPanel() {
  return (
    <CodesGate fallback={<StatusNote>{F.familyUnavailable}</StatusNote>}>
      <FamilyViews />
    </CodesGate>
  );
}

function FamilyViews() {
  const [view, setView] = useState<View>('phone');
  const [saved, setSaved] = useState(false);
  const go = (to: View) => () => setView(to);
  const firstTime = { label: F.firstTime, onClick: go('firstTime') };

  if (view === 'forgot' || view === 'firstTime') {
    const done = (ok: boolean) => {
      setSaved(ok);
      setView(ok ? 'username' : 'phone');
    };
    // A key per mode: «أول دخول؟» after «نسيت» starts empty.
    return <ResetFlow key={view} mode={view} onDone={done} />;
  }
  return (
    <>
      {view === 'phone' && <p className="text-body text-pretty text-ink-2">{F.familyIntro}</p>}
      {saved && <StatusNote>{F.passwordSaved}</StatusNote>}
      {view === 'phone' ? (
        <PhoneSignIn>
          <LinkRow links={[{ label: F.withUsername, onClick: go('username') }, firstTime]} />
        </PhoneSignIn>
      ) : (
        <PasswordForm id="username" label={F.username} hint={F.studentUsernameHint}>
          <LinkRow
            links={[{ label: F.withPhone, onClick: go('phone') }, { label: F.forgot, onClick: go('forgot') }, firstTime]}
          />
        </PasswordForm>
      )}
    </>
  );
}
