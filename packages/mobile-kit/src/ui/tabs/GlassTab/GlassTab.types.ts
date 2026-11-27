import type { TabIconName } from '../tab-icons';

export interface GlassTabProps {
  title: string;
  icon: TabIconName;
  badge?: string;
  focused: boolean;
  onPress: () => void;
}

export type GlassTabLook = Pick<GlassTabProps, 'title' | 'badge' | 'focused'>;
