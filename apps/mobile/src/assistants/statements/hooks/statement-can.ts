import { useMemo } from 'react';
import { usePermissions } from '@/auth/use-permissions';

export type StatementCan = { read: boolean; write: boolean; approve: boolean };

/** What this admin may do here (web use-statement-can): read, write (terms, void, generate, pay), approve. */
export function useStatementCan(): StatementCan {
  const can = usePermissions();
  const [read, write, approve] = [can('assistantpay.read'), can('assistantpay.write'), can('assistantpay.approve')];
  return useMemo(() => ({ read, write, approve }), [read, write, approve]);
}
