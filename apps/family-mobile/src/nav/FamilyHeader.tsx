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
  /** A pushed screen: «رجوع» before the title and no bell. A tab screen: the bell at the end. */
  back?: boolean;
  /** A tab of a guardian of several: the child in view under the title, a switch. */
  child?: PortalStudent | null;
}

/**
 * The family app's screen header: its title, then «رجوع» (pushed) or the bell (a tab); under it
 * the child switch on a tab of a guardian of several (canvas SwitchReports).
 */
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
