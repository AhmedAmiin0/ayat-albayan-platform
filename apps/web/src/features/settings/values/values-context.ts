import { createContext, useContext } from 'react';
import type { ValuesApi } from './use-values-controller';

/** «القيم»'s state for every row (edits, saves, permissions), so rows take only their key. */
export const ValuesContext = createContext<ValuesApi | null>(null);

export function useValues(): ValuesApi {
  const api = useContext(ValuesContext);
  if (!api) throw new Error('useValues outside ValuesContext');
  return api;
}
