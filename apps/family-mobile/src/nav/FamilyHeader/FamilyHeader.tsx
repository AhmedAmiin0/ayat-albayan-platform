import { router } from 'expo-router';
import { View } from 'react-native';
import { ScreenHeader, BackButton } from '@ab/mobile-kit';
import { ChildSwitchLink } from '@/nav/ChildSwitchLink';
import { FamilyBell } from '@/nav/FamilyBell';
import type { FamilyHeaderProps } from './FamilyHeader.types';

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
