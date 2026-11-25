import { useState } from 'react';
import { Toast, t } from '@ab/web-kit';
import { GoogleSection } from '@/features/platform/google-sync/GoogleSection';
import { ModuleHead } from './ModuleHead';

/** docs/26b §3. */
export function GooglePage() {
  const [note, setNote] = useState<string | null>(null);
  return (
    <>
      <ModuleHead title={t.settingsPages.google} />
      <GoogleSection onNote={setNote} />
      {note && <Toast message={note} onDismiss={() => setNote(null)} />}
    </>
  );
}
