import { createFileRoute } from '@tanstack/react-router';
import { linkListSearch, ShortLinksPage } from '@/features/platform/short-links';

export const Route = createFileRoute('/admin/short-links/')({
  validateSearch: linkListSearch,
  component: AdminShortLinks,
});

function AdminShortLinks() {
  const navigate = Route.useNavigate();
  return (
    <ShortLinksPage
      section="admin"
      search={Route.useSearch()}
      onSearch={(search) => void navigate({ search })}
    />
  );
}
