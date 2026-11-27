import type { ChildPanelProps } from './ChildPanel.types';
import { PANELS } from './child-panels';

export function ChildPanel({ tab, ...props }: ChildPanelProps) {
  return <>{PANELS[tab](props)}</>;
}
