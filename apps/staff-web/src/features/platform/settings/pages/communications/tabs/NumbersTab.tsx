import { LEGACY_LINE_GROUPS } from '@/features/platform/integrations/integration-places';
import { IntegrationsPanel } from '@/features/platform/integrations/IntegrationsPanel';
import { LinesCard } from '@/features/messaging/messaging/lines/LinesCard';
import { NumbersPanel } from '@/features/messaging/numbers/NumbersPanel';
import { t } from '@ab/web-kit';

const h = t.communicationsHub;

/** Legacy line rows are still read while comms_source is legacy (docs/26b §6a 10.1-10.15). */
export function NumbersTab({ onNote }: { onNote: (message: string) => void }) {
  return (
    <div className="grid gap-6">
      <NumbersPanel query="" onSaved={onNote} />
      {/* The lines check and the folded old rows side by side on a wide screen (closed by default). */}
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="min-w-0">
          <LinesCard />
        </div>
        <details className="group min-w-0 rounded-md border border-rule px-3 py-2">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold sm:min-h-8">{h.linesLegacyTitle}</summary>
          <div className="grid gap-2 pt-2 [&>section>h2]:sr-only">
            <IntegrationsPanel query="" onSaved={onNote} groups={LEGACY_LINE_GROUPS} title={h.linesLegacyTitle} intro={h.linesLegacyHint} />
          </div>
        </details>
      </div>
    </div>
  );
}
