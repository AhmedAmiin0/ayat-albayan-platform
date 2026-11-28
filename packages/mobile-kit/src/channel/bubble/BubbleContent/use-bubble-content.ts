import { useSmallText } from '../../../chat-ui/bubble/use-small-text';

export function useBubbleContent() {
  const small = useSmallText('ink3');
  return { small };
}
