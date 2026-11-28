import { shape } from '../../../theme';
import { useModeFade } from '../use-mode-fade';
import type { RoundActionProps } from './RoundAction.types';

export function useRoundAction(p: RoundActionProps) {
  const { mode, disabled = false, onSend, size = shape.control.touch } = p;
  const fade = useModeFade(mode);
  return { mode, disabled, onSend, size, fade };
}
