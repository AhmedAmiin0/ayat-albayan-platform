import { useSmallText } from '../../bubble/use-small-text';

export function usePdfStrip() {
  const small = useSmallText();
  return { small };
}
