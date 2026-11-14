import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { BackButton } from '@/core/ui/navigation';
import { Button } from '@/core/ui/primitives/Button';

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
