import { createFileRoute } from '@tanstack/react-router';
import { ShortLinkDetailPage } from '@/features/platform/short-links';

/** /admin/short-links/<code>: one link, its QR, users and visitors (docs/19). */
export const Route = createFileRoute('/admin/short-links/$code')({ component: AdminShortLink });

function AdminShortLink() {
  return <ShortLinkDetailPage section="admin" code={Route.useParams().code} />;
}
