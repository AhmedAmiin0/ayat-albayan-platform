import { router } from 'expo-router';
import { t } from '@/lib/i18n';
import { Button } from '@/ui/Button';
import { ScreenHeader } from '@/ui/ScreenHeader';

const back = () => (router.canGoBack() ? router.back() : router.replace('/more/ops/settings'));

/** A settings screen's title with «رجوع» to the list «الإعدادات». */
export function SubScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <ScreenHeader
      title={title}
      subtitle={subtitle}
      trailing={<Button variant="ghost" label={t.common.back} onPress={back} />}
    />
  );
}
