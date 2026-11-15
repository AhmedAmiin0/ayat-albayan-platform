import { useQuery } from '@tanstack/react-query';
import { evolutionQrQuery, evolutionStateQuery } from './evolution-api';

/** «افحص الاتصال»: asked only on the button (never on load), each press asks again. */
export function useEvolutionCheck(id: string) {
  const query = useQuery({ ...evolutionStateQuery(id), enabled: false });
  return {
    answer: query.data,
    pending: query.isFetching,
    failed: query.isError,
    check: () => void query.refetch(),
  };
}

/** The QR dialog: fetched when it opens, «تحديث الرمز» asks Evolution again. */
export function useEvolutionQr(id: string) {
  const query = useQuery(evolutionQrQuery(id));
  return {
    answer: query.data,
    pending: query.isFetching,
    failed: query.isError,
    refresh: () => void query.refetch(),
  };
}
