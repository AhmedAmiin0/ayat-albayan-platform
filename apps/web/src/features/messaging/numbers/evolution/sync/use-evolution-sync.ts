import type { EvolutionSyncView } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { t } from '@/lib/i18n/i18n';
import { useNumbersMutation } from '@/features/messaging/numbers/use-numbers-mutation';
import { putEvolutionConfig, pushEvolutionSync, readEvolutionSync } from './evolution-sync-api';

const e = t.numbers.evolution;

/**
 * «مزامنة الآن» (POST, the numbers refetch) and «تحقق» (GET, reads only): the latest answer of
 * either, whether one runs, and the last failure (a new press clears the other's). A failed push
 * drops the earlier answer, so the server's stored state shows (final review 4: never a stale
 * «متزامن»).
 */
export function useEvolutionSync(id: string) {
  const [last, setLast] = useState<EvolutionSyncView | null>(null);
  const clear = () => setLast(null);
  const push = useNumbersMutation(pushEvolutionSync, {
    onDone: setLast,
    note: e.sync.pushed,
    onFail: clear,
  });
  const verify = useMutation({ mutationFn: readEvolutionSync, onSuccess: setLast });
  return {
    last,
    pending: push.isPending || verify.isPending,
    error: push.error ?? verify.error,
    push: () => {
      verify.reset();
      push.mutate(id);
    },
    verify: () => {
      push.reset();
      verify.mutate(id);
    },
  };
}

/** «احفظ وزامن»: PUT the options; the answer (the sync view) stays shown in the dialog. */
export function useSaveEvolutionConfig() {
  const [answer, setAnswer] = useState<EvolutionSyncView | null>(null);
  const save = useNumbersMutation(putEvolutionConfig, { onDone: setAnswer, note: e.config.saved });
  return { save, answer };
}
