import { Button } from '@ab/web-kit/components/ui/form/button';
import { Dialog } from '@ab/web-kit/components/ui/overlay/dialog';
import { Toast } from '@ab/web-kit/components/ui/overlay/toast';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { KickController } from './use-kick';

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
