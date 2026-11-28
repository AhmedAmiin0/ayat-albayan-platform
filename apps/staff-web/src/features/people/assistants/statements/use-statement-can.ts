import { useMemo } from 'react';
import { usePermissions } from '@ab/web-kit';
import type { StatementCan } from './StatementActions';

/** What this admin may do on a statement (a stable object, so columns are not rebuilt). */
export function useStatementCan(): StatementCan & { read: boolean } {
  const { can } = usePermissions();
  const [read, write, approve] = [
    can('assistantpay.read'),
    can('assistantpay.write'),
    can('assistantpay.approve'),
  ];
  return useMemo(() => ({ read, write, approve }), [read, write, approve]);
}
