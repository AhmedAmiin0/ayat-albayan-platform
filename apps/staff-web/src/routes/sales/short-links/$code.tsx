import { createFileRoute } from '@tanstack/react-router';
import { ShortLinkDetailPage } from '@/features/platform/short-links';

/** /sales/short-links/<code>: one of the salesperson's links (docs/19). */
export const Route = createFileRoute('/sales/short-links/$code')({ component: SalesShortLink });

function SalesShortLink() {
  return <ShortLinkDetailPage section="sales" code={Route.useParams().code} />;
}
