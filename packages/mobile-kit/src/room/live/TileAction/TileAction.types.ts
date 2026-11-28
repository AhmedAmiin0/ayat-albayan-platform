import type { ReactNode } from 'react';

export interface TileActionProps {
  label: string;
  onPress: () => void;
  icon: (ink: string) => ReactNode;
}
