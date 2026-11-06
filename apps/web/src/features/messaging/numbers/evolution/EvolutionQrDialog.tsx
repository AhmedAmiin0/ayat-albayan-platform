import type { NumberView } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Dialog } from '@/components/ui/overlay/dialog';
import { t } from '@/lib/i18n/i18n';
import { EvolutionQrAnswer } from './EvolutionQrAnswer';
import { EvolutionStateLine } from './EvolutionStateLine';
import { useEvolutionQr } from './use-evolution';

const e = t.numbers.evolution;

/**
 * «اربط الرقم بمسح الرمز» (Baileys): fetched on open from Evolution's /instance/connect, with how
 * to scan it on the phone and «تحديث الرمز» (a QR expires in under a minute). The ban warning
 * comes first: never link the academy's main chat number.
 */
export function EvolutionQrDialog({ view, onClose }: { view: NumberView; onClose: () => void }) {
  const qr = useEvolutionQr(view.id);
  return (
    <Dialog
      title={e.qrTitle}
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>{t.common.close}</Button>
          <Button disabled={qr.pending} onClick={qr.refresh}>{e.refresh}</Button>
        </>
      }
    >
      <div className="grid gap-3">
        <FormAlert>
          <strong>{e.qrWarning}</strong>
        </FormAlert>
        <p className="text-sm text-ink-2">{e.qrHint}</p>
        {qr.failed && <FormAlert>{e.failed}</FormAlert>}
        {qr.pending && !qr.answer && <p className="text-sm text-ink-3">{t.common.loading}</p>}
        {qr.answer && <EvolutionStateLine state={qr.answer.state} at={null} />}
        {qr.answer && <EvolutionQrAnswer answer={qr.answer} label={view.label} />}
      </div>
    </Dialog>
  );
}
