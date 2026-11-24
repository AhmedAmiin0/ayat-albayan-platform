import type { SendGateView } from '@ab/shared';
import { counted } from '@ab/core';
import { NuqtaGlyph } from '@ab/web-kit/components/ui/display/nuqta-glyph';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const s = t.templates.settings;

export const queuedText = (n: number): string => (n === 0 ? s.queued.zero : counted(s.queued, n));

/** No env fuse any more (docs/23); `restricted` means the allow-list holds other numbers. */
export function ServerGateNote({ gate }: { gate: SendGateView }) {
  const server = gate.reason === 'not_configured' ? s.gateNotConfigured : null;
  return (
    <div className="grid gap-1 text-xs">
      {server && (
        <p className="flex items-start gap-2 font-semibold text-danger">
          <NuqtaGlyph shape="struck" className="mt-0.5" />
          <span>{server}</span>
        </p>
      )}
      <p className="text-ink-2">{queuedText(gate.queued)}</p>
      {gate.restricted && <p className="text-ink-2">{s.recipientsRestricted}</p>}
    </div>
  );
}
