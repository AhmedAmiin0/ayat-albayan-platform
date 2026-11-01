import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Toast } from '@/components/ui/overlay/toast';
import { INTEGRATIONS_PAGE_GROUPS } from '@/features/platform/integrations/integration-places';
import { IntegrationsPanel } from '@/features/platform/integrations/IntegrationsPanel';
import { t } from '@/lib/i18n/i18n';
import { ModuleHead } from './ModuleHead';

const h = t.communicationsHub;

/**
 * /admin/settings/integrations «التكاملات» (docs/26b §3): the services that are not messaging
 * (LiveKit, Expo, Web Push, exchange rates, Google's OAuth client). The WhatsApp, Kapso and safety
 * groups moved to «التواصل» (docs/23 phase 6), which the line on top links to. Google's sync has its
 * own page; an OAuth return here is sent there by the route. With FEATURE_STRIPE=test the
 * Stripe group («الدفع الإلكتروني», docs/30) is one of the groups: its switch, keys and cap.
 */
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
      {/* The panel's own «التكاملات» h2 repeats the page title: kept for the region's name, not shown. */}
      <div className="[&>section>h2]:sr-only">
        <IntegrationsPanel query="" onSaved={setNote} groups={INTEGRATIONS_PAGE_GROUPS} />
      </div>
      {note && <Toast message={note} onDismiss={() => setNote(null)} />}
    </>
  );
}
