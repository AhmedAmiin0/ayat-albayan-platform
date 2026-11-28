import type { EvolutionQrView } from '@ab/shared';
import { t } from '@ab/web-kit';
import { qrImageOf } from './evolution-api';

const e = t.numbers.evolution;

export interface EvolutionQrAnswerProps {
  answer: EvolutionQrView;
  /** The number's name, for the image's alternative text. */
  label: string;
}

/** Only a PNG data URL is accepted for the QR. */
export function EvolutionQrAnswer({ answer, label }: EvolutionQrAnswerProps) {
  const src = qrImageOf(answer.qr);
  const [before, after = ''] = e.pairingCode.split('{{code}}');
  return (
    <div className="grid justify-items-center gap-2">
      {src ? (
        <img src={src} alt={`${e.qr}: ${label}`} className="size-64 rounded-md bg-white p-2" />
      ) : (
        <p className="text-sm text-ink-2">{e.qrNone}</p>
      )}
      {answer.pairing_code && (
        <p className="text-sm font-semibold">
          {before}
          <bdi dir="ltr" className="font-mono">{answer.pairing_code}</bdi>
          {after}
        </p>
      )}
    </div>
  );
}
