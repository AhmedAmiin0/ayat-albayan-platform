import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Toast } from '@/components/ui/toast';
import { t } from '@/lib/i18n';
import type { KickController } from './use-kick';

/** The confirm step of «إخراج من الحلقة» and the toast that reports how it went. */
export function KickDialog({ kick }: { kick: KickController }) {
  const { target, toast } = kick;
  return (
    <>
      {target && (
        <Dialog
          title={t.classroom.kick.title.replace('{name}', target.name)}
          description={t.classroom.kick.body}
          glyph={{ tone: 'bad', shape: 'struck' }}
          onClose={kick.cancel}
          compact
          actions={
            <>
              <Button type="button" variant="ghost" onClick={kick.cancel}>
                {t.common.cancel}
              </Button>
              <Button type="button" variant="danger" disabled={kick.busy} onClick={kick.confirm}>
                {kick.busy ? t.classroom.kick.busy : t.classroom.kick.confirm}
              </Button>
            </>
          }
        >
          {null}
        </Dialog>
      )}
      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={kick.dismiss} className="bottom-24" />}
    </>
  );
}
