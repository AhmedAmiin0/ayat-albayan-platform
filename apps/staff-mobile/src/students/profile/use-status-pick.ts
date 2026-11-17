import { statusRoute, type StatusRoute } from '@ab/client-core';
import type { StudentStatus } from '@ab/shared';
import { useState } from 'react';
import { t } from '@ab/mobile-kit';
import { useActionKeys } from '@/students/course-actions/ActionButtons';
import { useCurrentPackage, useHeldPackage } from '@/students/course-actions/course-actions-api';
import type { StatusAsk } from '@/students/course-card/StatusSheets';

/** «متوقف» while the package is read: «جارٍ التحميل», or the error when it cannot be read. */
type StopRead = 'idle' | 'waiting' | 'failed';
const STOP_READ_LINE: Record<StopRead, string | null> = {
  idle: null,
  waiting: t.common.loading,
  failed: t.common.error,
};

/**
 * Where a status pill leads (owner 2026-11-17): «موقوف مؤقتًا» opens the pause; «متوقف» opens the
 * stop of the current package, or, with no package (404, or no key to ask), `setNow` sets it at
 * once. While the package is not known yet it waits for it (never mistaken for «no package»); a
 * failed read says so. The rest are set at once.
 */
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
    /** The package «إلغاء الاشتراك» stops (kept while its sheet is open). */
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
