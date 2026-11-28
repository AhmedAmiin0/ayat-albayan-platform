import { useMemo } from 'react';
import { usePermissions } from '@ab/mobile-kit';

export interface StatementCan {
  read: boolean;
  write: boolean;
  approve: boolean;
}

/** Web use-statement-can: read, write (terms, void, generate, pay), approve. */
export function useStatementCan(): StatementCan {
  const can = usePermissions();
  const [read, write, approve] = [
    can('assistantpay.read'),
    can('assistantpay.write'),
    can('assistantpay.approve'),
  ];
  return useMemo(() => ({ read, write, approve }), [read, write, approve]);
}
