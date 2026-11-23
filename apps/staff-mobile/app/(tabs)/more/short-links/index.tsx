import { usePermissions } from '@ab/mobile-kit';
import { ShortLinksScreen } from '@/short-links';

export default function ShortLinksRoute() {
  return <ShortLinksScreen can={usePermissions()} base="/more/short-links" />;
}
