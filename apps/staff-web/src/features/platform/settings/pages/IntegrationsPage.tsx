import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Toast, t } from '@ab/web-kit';
import { INTEGRATIONS_PAGE_GROUPS } from '@/features/platform/integrations';
import { IntegrationsPanel } from '@/features/platform/integrations';
import { ModuleHead } from './ModuleHead';

const h = t.communicationsHub;

/** docs/26b §3: messaging groups moved to communications (docs/23 phase 6). */
export function IntegrationsPage() {
  const [note, setNote] = useState<string | null>(null);
  return (
    <>
      <ModuleHead title={t.integrations.title} />
      <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink-2">
        <span>{h.movedToComms}</span>
        <Link
          to="/admin/settings/communications"
          search={{ tab: 'safety' }}
          className="inline-flex min-h-11 items-center font-semibold text-lapis underline underline-offset-4 sm:min-h-0"
        >
          {h.movedToCommsLink}
        </Link>
      </p>
      {/* Kept for the region's accessible name but visually hidden. */}
      <div className="[&>section>h2]:sr-only">
        <IntegrationsPanel query="" onSaved={setNote} groups={INTEGRATIONS_PAGE_GROUPS} />
      </div>
      {note && <Toast message={note} onDismiss={() => setNote(null)} />}
    </>
  );
}
