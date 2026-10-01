import { Link } from '@tanstack/react-router';
import { Icon, type IconName } from '@/components/ui/icon';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// The fihris (surah index) nav, docs/07 §7. Only Phase 1 routes that exist; future screens
// (الجدول، التقارير، الاشتراكات، لوحة التحكم) join when their routes land, never as dead links.
const GROUPS = [
  [
    { key: 'leads', to: '/admin/leads', label: t.nav.leads, icon: 'chat' },
    { key: 'jobApplicants', to: '/admin/job-applicants', label: t.nav.jobApplicants, icon: 'brief' },
  ],
  [
    { key: 'students', to: '/admin/students', label: t.nav.students, icon: 'users' },
    { key: 'teachers', to: '/admin/teachers', label: t.nav.teachers, icon: 'teacher' },
  ],
] as const satisfies readonly (readonly { key: string; to: string; label: string; icon: IconName }[])[];

export type NavKey = (typeof GROUPS)[number][number]['key'];
/** A real count from the API. `act` = work waiting for the admin (saffron, says what it is). */
export type NavCount = { text: string; act?: boolean };

export interface AdminNavProps {
  /** Counts only where real data exists; a missing key renders no count. */
  counts?: Partial<Record<NavKey, NavCount>>;
}

/** Sidebar list ≥900px (dot leaders + counts); a scrolling top row below (saffron counts only). */
export function AdminNav({ counts = {} }: AdminNavProps) {
  return (
    <nav
      aria-label={t.nav.label}
      className="ab-fade-end flex min-w-0 flex-1 gap-0.5 overflow-x-auto pe-10 [scrollbar-width:none] shell:flex-none shell:flex-col shell:gap-3.5 shell:overflow-visible shell:pe-0 shell:[mask-image:none]"
    >
      {GROUPS.map((group) => (
        <ul key={group[0].key} className="flex gap-0.5 shell:flex-col">
          {group.map((item) => {
            const count = counts[item.key];
            return (
              <li key={item.key}>
                <Link
                  to={item.to}
                  className="group flex min-h-[38px] items-center gap-2 whitespace-nowrap rounded-md px-2.5 font-medium text-ink-2 hover:bg-sunk hover:text-ink aria-[current=page]:bg-page aria-[current=page]:font-semibold aria-[current=page]:text-ink aria-[current=page]:shadow-[0_0_0_1px_var(--rule-strong)]"
                >
                  <Icon name={item.icon} className="text-ink-3 group-aria-[current=page]:text-lapis" />
                  <span>{item.label}</span>
                  {count && (
                    <>
                      {' '}
                      <i aria-hidden="true" className="mt-1.5 hidden h-px min-w-1.5 flex-1 border-t-[1.5px] border-dotted border-rule-strong shell:block" />
                      <span
                        className={cn(
                          'text-2xs tabular-nums',
                          count.act ? 'font-bold text-act' : 'hidden font-medium text-ink-3 shell:inline',
                        )}
                      >
                        {count.text}
                      </span>
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      ))}
    </nav>
  );
}
