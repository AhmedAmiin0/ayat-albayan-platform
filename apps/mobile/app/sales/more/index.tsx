import { usePermissions } from '@ab/mobile-kit';
import { SalesMoreScreen } from '@/sales/app';

export default function SalesMoreRoute() {
  return <SalesMoreScreen can={usePermissions()} />;
}
