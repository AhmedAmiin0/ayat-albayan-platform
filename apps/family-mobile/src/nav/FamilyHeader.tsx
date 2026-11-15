import { router } from 'expo-router';
import { t, ScreenHeader, BackButton, Button } from '@ab/mobile-kit';

interface FamilyHeaderProps {
  title: string;
  /** A «رجوع» before the title (a screen pushed on top of home). */
  back?: boolean;
  /** «الإعدادات» at the inline-end (home and a student's own page). */
  settings?: boolean;
}

/** The family app's screen header: its title, optional «رجوع», optional «الإعدادات». */
export function FamilyHeader({ title, back = false, settings = false }: FamilyHeaderProps) {
  return (
    <ScreenHeader
      title={title}
      leading={back ? <BackButton onPress={() => router.back()} /> : undefined}
      trailing={
        settings ? (
          <Button
            variant="ghost"
            label={t.familyApp.home.settings}
            onPress={() => router.push('/settings')}
          />
        ) : undefined
      }
    />
  );
}
