import { useState } from 'react';
import { Toast } from '@/components/ui/toast';
import { IntegrationsPanel } from '@/features/integrations/IntegrationsPanel';
import { t } from '@/lib/i18n';
import { ModuleHead } from './ModuleHead';

/**
 * /admin/settings/integrations «التكاملات» (docs/26b §3): the integrations form on its own page, as it
 * was (Google moved to «مزامنة Google»; an OAuth return here is sent there by the route).
 */
export function IntegrationsPage() {
  const [note, setNote] = useState<string | null>(null);
  return (
    <>
      <ModuleHead title={t.integrations.title} />
      {/* The panel's own «التكاملات» h2 repeats the page title: kept for the region's name, not shown. */}
      <div className="[&>section>h2]:sr-only">
        <IntegrationsPanel query="" onSaved={setNote} />
      </div>
      {note && <Toast message={note} onDismiss={() => setNote(null)} />}
    </>
  );
}
