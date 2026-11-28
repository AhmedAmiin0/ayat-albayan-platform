import { useBlink } from '../use-blink';

export function useRecDot() {
  const blink = useBlink();
  return { blink };
}
