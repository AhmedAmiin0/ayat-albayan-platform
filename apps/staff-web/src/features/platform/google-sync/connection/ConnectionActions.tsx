import type { GoogleStatusView } from '@ab/catalog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Dialog } from '@ab/web-kit/components/ui/overlay/dialog';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { disconnectGoogle, getConnectUrl, googleStatusQuery } from '@/features/platform/google-sync/google-api';

const s = t.googleSync.connection;

/** Disconnecting asks first. */
export function ConnectionActions({ status, onNote }: { status: GoogleStatusView; onNote: (message: string) => void }) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const connect = useMutation({
    mutationFn: getConnectUrl,
    onSuccess: ({ url }) => window.location.assign(url),
  });
  const disconnect = useMutation({
    mutationFn: disconnectGoogle,
    onSuccess: (next) => {
      queryClient.setQueryData(googleStatusQuery.queryKey, next);
      setConfirming(false);
      onNote(s.disconnected);
    },
  });
  const linked = status.connection.status !== 'disconnected';
  const busy = connect.isPending || connect.isSuccess;
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={!status.configured || busy} onClick={() => connect.mutate()}>
          {busy ? s.connecting : linked ? s.reconnect : s.connect}
        </Button>
        {linked && (
          <Button variant="danger-quiet" onClick={() => setConfirming(true)}>
            {s.disconnect}
          </Button>
        )}
      </div>
      {connect.isError && <FormAlert>{t.googleSync.common.saveError}</FormAlert>}
      {confirming && (
        <Dialog
          title={s.disconnect}
          glyph={{ tone: 'bad', shape: 'struck' }}
          description={s.disconnectConfirm}
          onClose={() => setConfirming(false)}
          compact
          actions={
            <>
              <Button variant="secondary" data-autofocus onClick={() => setConfirming(false)}>
                {t.googleSync.confirm.cancel}
              </Button>
              <Button variant="danger" disabled={disconnect.isPending} onClick={() => disconnect.mutate()}>
                {s.disconnect}
              </Button>
            </>
          }
        >
          {disconnect.isError && <FormAlert>{t.googleSync.common.saveError}</FormAlert>}
        </Dialog>
      )}
    </div>
  );
}
