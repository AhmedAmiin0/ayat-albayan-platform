import type { PortalStudent } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { ScreenHeader, BackButton } from '@ab/mobile-kit';
import { ChildSwitchLink } from './ChildSwitchLink';
import { FamilyBell } from './FamilyBell';

interface FamilyHeaderProps {
  title: string;
  /** A line under the title. */
  subtitle?: string;
  /** A pushed screen shows back and no bell; a tab screen shows the bell. */
  back?: boolean;
  /** A tab of a guardian of several: the child in view under the title, a switch. */
  child?: PortalStudent | null;
}

export function FamilyHeader({ title, subtitle, back = false, child }: FamilyHeaderProps) {
  return (
    <View style={{ gap: 4 }}>
      <ScreenHeader
        title={title}
        subtitle={subtitle}
        leading={back ? <BackButton onPress={() => router.back()} /> : undefined}
        trailing={back ? undefined : <FamilyBell />}
      />
      {child ? <ChildSwitchLink student={child} /> : null}
    </View>
  );
}
