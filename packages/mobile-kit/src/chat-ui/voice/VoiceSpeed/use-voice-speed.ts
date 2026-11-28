import { useSmallText } from '../../bubble/use-small-text';

export function useVoiceSpeed() {
  const small = useSmallText();
  return { small };
}
