import { createFileRoute } from '@tanstack/react-router';
import { linkListSearch, ShortLinksPage } from '@/features/platform/short-links';

export const Route = createFileRoute('/sales/short-links/')({
  validateSearch: linkListSearch,
  component: SalesShortLinks,
});

function SalesShortLinks() {
  const navigate = Route.useNavigate();
  return (
    <ShortLinksPage
      section="sales"
      search={Route.useSearch()}
      onSearch={(search) => void navigate({ search })}
    />
  );
}
