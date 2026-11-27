import { useMaintenance } from '../use-maintenance';
import { hiddenWhile } from './root-frame.helpers';

export function useRootFrame() {
  const { view, checking, retry } = useMaintenance();
  return { view, checking, retry, hidden: hiddenWhile(view !== 'open') };
}
