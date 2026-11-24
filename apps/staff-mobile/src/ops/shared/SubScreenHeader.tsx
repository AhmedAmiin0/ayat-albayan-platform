import { backWithin } from '@/core/nav/back-within';
import { BackButton, ScreenHeader } from '@ab/mobile-kit';

const back = () => backWithin('/more/ops/settings');

export function SubScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <ScreenHeader
      title={title}
      subtitle={subtitle}
      leading={<BackButton onPress={back} />}
    />
  );
}
