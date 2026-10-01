import { Link } from '@tanstack/react-router';
import { t } from '@/lib/i18n';

// Phase 1 admin sections (route files under src/routes/admin/).
const ITEMS = [
  { to: '/admin/students', label: t.nav.students },
  { to: '/admin/teachers', label: t.nav.teachers },
  { to: '/admin/leads', label: t.nav.leads },
  { to: '/admin/job-applicants', label: t.nav.jobApplicants },
] as const;

/** Top navigation for the /admin layout. */
export function AdminNav() {
  return (
    <nav aria-label={t.admin.dashboardTitle} className="flex gap-1 border-b border-border px-4">
      {ITEMS.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          activeProps={{ className: 'border-b-2 border-primary font-semibold text-foreground' }}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
