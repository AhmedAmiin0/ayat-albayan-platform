import { statusRoute, type StatusRoute } from '@ab/client-core';
import type { StudentStatus } from '@ab/shared';
import { useState } from 'react';
import { t } from '@ab/mobile-kit';
import { useActionKeys } from '@/students/course-actions/ActionButtons';
import { useCurrentPackage, useHeldPackage } from '@/students/course-actions/course-actions-api';
import type { StatusAsk } from '@/students/course-card/StatusSheets';

type StopRead = 'idle' | 'waiting' | 'failed';
const STOP_READ_LINE: Record<StopRead, string | null> = {
  idle: null,
  waiting: t.common.loading,
  failed: t.common.error,
};

/** Stopped waits for the package, never mistaken for no package; with none it is set at once. */
export function useStatusPick(studentId: string, setNow: (status: StudentStatus) => void) {
  const keys = useActionKeys();
  const sub = useCurrentPackage({ studentId, given: undefined, keys });
  const [ask, setAsk] = useState<StatusAsk>(null);
  const [read, setRead] = useState<StopRead>('idle');
  const stopping = useHeldPackage(sub.id ?? null, ask === 'stop');
  const stop = async () => {
    setRead('waiting');
    const id = sub.id === undefined ? await sub.settle() : sub.id;
    setRead(id === undefined ? 'failed' : 'idle');
    if (id) setAsk('stop');
    if (id === null) setNow('churned');
  };
  const routes: Record<StatusRoute, (status: StudentStatus) => void> = {
    set: setNow,
    pause: () => setAsk('pause'),
    stop: () => void stop(),
  };
  return {
    ask,
    /** Kept while the cancel sheet is open. */
    stopping,
    line: STOP_READ_LINE[read],
    waiting: read === 'waiting',
    pick: (status: StudentStatus) => {
      setRead('idle');
      routes[statusRoute(status)](status);
    },
    close: () => setAsk(null),
  };
}
