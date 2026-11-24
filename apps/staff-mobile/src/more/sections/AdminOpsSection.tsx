import { router } from 'expo-router';
import { allowedRows } from '@/core/auth/route-permissions';
import { t, ListRow, InsetGroup, Section } from '@ab/mobile-kit';
import type { Can } from '@ab/mobile-kit';

const rows = () =>
  [
    { route: 'dashboard', title: t.mobileAdmin.rows.dashboard, href: '/more/ops/dashboard' },
    { route: 'settings', title: t.mobileAdmin.rows.settings, href: '/more/ops/settings' },
    { route: 'activity', title: t.mobileAdmin.rows.activity, href: '/more/ops/activity' },
    { route: 'templates', title: t.templates.author.nav, href: '/more/templates' },
    { route: 'shortLinks', title: t.nav.shortLinks, href: '/more/short-links' },
  ] as const;

export function AdminOpsSection({ can = () => true }: { can?: Can }) {
  const shown = allowedRows(can, rows());
  if (shown.length === 0) return null;
  return (
    <Section title={t.mobileAdmin.section}>
      <InsetGroup>
        {shown.map((r) => (
          <ListRow key={r.href} title={r.title} onPress={() => router.push(r.href)} />
        ))}
      </InsetGroup>
    </Section>
  );
}
