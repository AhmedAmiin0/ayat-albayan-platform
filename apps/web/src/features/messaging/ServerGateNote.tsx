import { counted, type SendGateView } from '@ab/shared';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { t } from '@/lib/i18n';

const s = t.templates.settings;

/** «رسالتين مستنيين في الطابور» / «مفيش رسايل مستنية في الطابور». */
export const queuedText = (n: number): string => (n === 0 ? s.queued.zero : counted(s.queued, n));

/**
 * The gates the admin's switch can't open (docs/12 §3.1): MESSAGING_ENABLED off on the server,
 * or WhatsApp not configured there. With either closed, «الإرسال شغال» alone would mislead.
 * `restricted`: the server's allow-list (WA_ALLOWED_RECIPIENTS, docs/12 §13.5) holds other numbers.
 */
export function ServerGateNote({ gate }: { gate: SendGateView }) {
  const server = gate.reason === 'env_off' ? s.gateEnvOff : gate.reason === 'not_configured' ? s.gateNotConfigured : null;
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
