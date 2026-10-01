import { Link } from '@tanstack/react-router';
import { t } from '@/lib/i18n';

// Phase 1 admin sections. Builders own the route files (src/routes/admin.students.tsx, …).
const ITEMS = [
  { to: '/admin/students', label: t.nav.students },
  { to: '/admin/teachers', label: t.nav.teachers },
  { to: '/admin/leads', label: t.nav.leads },
] as const;

// ponytail: cast until the builders' route files exist and `tsr generate` types these paths;
// then drop `as '/admin'`.
type NavPath = '/admin';

/** Top navigation for the /admin layout. */
export function AdminNav() {
  return (
    <nav aria-label={t.admin.dashboardTitle} className="flex gap-1 border-b border-border px-4">
      {ITEMS.map((item) => (
        <Link
          key={item.to}
          to={item.to as string as NavPath}
          className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          activeProps={{ className: 'border-b-2 border-primary font-semibold text-foreground' }}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
