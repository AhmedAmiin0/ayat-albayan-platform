import { useQuery } from '@tanstack/react-query';
import { evolutionQrQuery, evolutionStateQuery } from './evolution-api';

/** Asked only on the button, never on load. */
export function useEvolutionCheck(id: string) {
  const query = useQuery({ ...evolutionStateQuery(id), enabled: false });
  return {
    answer: query.data,
    pending: query.isFetching,
    failed: query.isError,
    check: () => void query.refetch(),
  };
}

export function useEvolutionQr(id: string) {
  const query = useQuery(evolutionQrQuery(id));
  return {
    answer: query.data,
    pending: query.isFetching,
    failed: query.isError,
    refresh: () => void query.refetch(),
  };
}
