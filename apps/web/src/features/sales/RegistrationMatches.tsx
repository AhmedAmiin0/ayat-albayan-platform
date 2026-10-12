import type { RegistrationCheckView } from '@ab/shared';
import { Ltr } from '@/components/ui/ltr';
import { t } from '@/lib/i18n';
import type { CheckBy } from './registration-check';

const R = t.registrationCheck;

/** The answer: «مسجّل: n طالب» and each child (name, code, status, teacher), or «لا يوجد…». */
export function RegistrationMatches({ view, by }: { view: RegistrationCheckView; by: CheckBy }) {
  if (!view.found) {
    return <p role="status" className="text-sm text-ink-2">{by === 'phone' ? R.notFoundPhone : R.notFoundName}</p>;
  }
  return (
    <div className="grid gap-2">
      <p role="status" className="text-sm font-bold text-ink">{R.found.replace('{n}', String(view.matches.length))}</p>
      <ul className="grid gap-2">
        {view.matches.map((m) => (
          <li key={m.code} className="grid gap-1 rounded-md border border-rule p-3 text-sm">
            <span className="inline-flex items-baseline gap-3">
              <span className="font-semibold text-ink">{m.name}</span>
              <Ltr className="text-ink-2">{m.code}</Ltr>
            </span>
            <span className="text-ink-2">
              {R.status}: {t.enums.studentStatus[m.status]}
            </span>
            <span className="text-ink-2">
              {R.teacher}: {m.teacher_name ?? <span className="text-ink-3">{R.noTeacher}</span>}
            </span>
          </li>
        ))}
      </ul>
      {view.more && <p className="text-xs text-ink-3">{R.more}</p>}
    </div>
  );
}
