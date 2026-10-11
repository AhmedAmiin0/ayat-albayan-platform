import { useCallback, useMemo, useState } from 'react';
import { usePermissions } from '@/features/auth/use-permissions';

/** What the students table needs to draw its «تحديد» column. */
export type PickColumn = { isPicked: (id: string) => boolean; toggle: (id: string) => void };

export type StudentPick = {
  /** Only an admin who may write assistant pay can pick. */
  enabled: boolean;
  ids: readonly string[];
  /** Undefined when picking is off: the table then has no extra column. */
  column: PickColumn | undefined;
  clear: () => void;
};

/** The students list's row selection for the bulk «تعيين مسؤول مبيعات» (kept while paging). */
export function useStudentPick(): StudentPick {
  const enabled = usePermissions().can('assistantpay.write');
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const toggle = useCallback(
    (id: string) =>
      setPicked((prev) => {
        const next = new Set(prev);
        if (!next.delete(id)) next.add(id);
        return next;
      }),
    [],
  );
  const clear = useCallback(() => setPicked(new Set()), []);
  const column = useMemo(() => (enabled ? { isPicked: (id: string) => picked.has(id), toggle } : undefined), [enabled, picked, toggle]);
  return { enabled, ids: [...picked], column, clear };
}
