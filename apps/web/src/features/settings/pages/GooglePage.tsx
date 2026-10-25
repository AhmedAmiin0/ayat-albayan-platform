import { useState } from 'react';
import { Toast } from '@/components/ui/overlay/toast';
import { GoogleSection } from '@/features/google-sync/GoogleSection';
import { t } from '@/lib/i18n/i18n';
import { ModuleHead } from './ModuleHead';

/**
 * /admin/settings/google «مزامنة Google» (docs/26b §3): today's Google cards (connection, switches,
 * Drive, the two mappings and the sync log) on their own page, as they were. Back from Google's
 * consent screen the section shows the note and clears `?google=` (use-oauth-return).
 */
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
