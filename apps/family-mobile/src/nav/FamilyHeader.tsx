import { router } from 'expo-router';
import { ScreenHeader, BackButton } from '@ab/mobile-kit';
import { FamilyBell } from './FamilyBell';

interface FamilyHeaderProps {
  title: string;
  /** A line under the title. */
  subtitle?: string;
  /** A pushed screen: «رجوع» before the title and no bell. A tab screen: the bell at the end. */
  back?: boolean;
}

/** The family app's screen header: its title, then «رجوع» (pushed) or the bell (a tab). */
export function FamilyHeader({ title, subtitle, back = false }: FamilyHeaderProps) {
  return (
    <ScreenHeader
      title={title}
      subtitle={subtitle}
      leading={back ? <BackButton onPress={() => router.back()} /> : undefined}
      trailing={back ? undefined : <FamilyBell />}
    />
  );
}
