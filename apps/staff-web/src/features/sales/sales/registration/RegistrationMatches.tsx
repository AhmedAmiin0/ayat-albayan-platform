import type { RegistrationCheckView, RegistrationMatch } from '@ab/shared';
import { Ltr } from '@/components/ui/display/ltr';
import { t } from '@/lib/i18n/i18n';
import type { CheckBy } from './registration-check';

const R = t.registrationCheck;

interface RegistrationMatchesProps {
  view: RegistrationCheckView;
  by: CheckBy;
  /** «ربط بطالب موجود»: each child becomes a button that picks it; `picked` is the chosen code. */
  onPick?: (m: RegistrationMatch) => void;
  picked?: string | null;
}

function MatchLines({ m }: { m: RegistrationMatch }) {
  return (
    <>
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
    </>
  );
}

const ROW = 'grid gap-1 rounded-md border p-3 text-sm';

/** The answer: «مسجّل: n طالب» and each child (name, code, status, teacher), or «لا يوجد…». */
export function RegistrationMatches({ view, by, onPick, picked = null }: RegistrationMatchesProps) {
  if (!view.found) {
    return <p role="status" className="text-sm text-ink-2">{by === 'phone' ? R.notFoundPhone : R.notFoundName}</p>;
  }
  return (
    <div className="grid gap-2">
      <p role="status" className="text-sm font-bold text-ink">{R.found.replace('{n}', String(view.matches.length))}</p>
      <ul className="grid gap-2">
        {view.matches.map((m) => (
          <li key={m.code} className={onPick ? 'grid' : `${ROW} border-rule`}>
            {onPick ? (
              <button
                type="button"
                aria-pressed={picked === m.code}
                onClick={() => onPick(m)}
                className={`${ROW} min-h-11 text-start hover:bg-sunk ${picked === m.code ? 'border-lapis bg-accent' : 'border-rule'}`}
              >
                <MatchLines m={m} />
              </button>
            ) : (
              <MatchLines m={m} />
            )}
          </li>
        ))}
      </ul>
      {view.more && <p className="text-xs text-ink-3">{R.more}</p>}
    </div>
  );
}
