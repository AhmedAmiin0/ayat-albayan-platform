import { usePermissions } from '@ab/mobile-kit';
import { MoreScreen } from '@/more';

export default function MoreRoute() {
  return <MoreScreen can={usePermissions()} />;
}
