import type { useModeFade } from '../../use-mode-fade';
import type { RoundActionProps } from '../RoundAction.types';

export interface RoundIconProps {
  mode: RoundActionProps['mode'];
  fade: ReturnType<typeof useModeFade>;
}
