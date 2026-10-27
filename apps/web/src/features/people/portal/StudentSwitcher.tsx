import type { PortalHome, PortalStudent } from '@ab/shared';
import { RadioChips } from '@/components/ui/form/radio-chips';
import { t } from '@/lib/i18n/i18n';

interface Props {
  home: PortalHome;
  value: string;
  onChange: (studentId: string) => void;
}

/** «أبنائي», or «حسابي» for a student login or an adult student who is their own contact. */
export function switcherTitle(home: PortalHome): string {
  const self = home.kind === 'student' || (home.students.length === 1 && home.students[0]?.contact_is_self);
  return self ? t.portal.myAccount : t.portal.myChildren;
}

/** The guardian's children as chips (one choice); a single student is just named. */
export function StudentSwitcher({ home, value, onChange }: Props) {
  const title = switcherTitle(home);
  if (home.students.length < 2) {
    const only: PortalStudent | undefined = home.students[0];
    return (
      <div className="grid gap-0.5">
        <p className="text-sm font-semibold text-ink-2">{title}</p>
        {only && <p className="font-display text-h3 font-bold">{only.name}</p>}
      </div>
    );
  }
  return (
    <RadioChips
      name="portal-student"
      legend={title}
      options={home.students.map((s) => ({ value: s.id, label: s.name }))}
      value={value}
      onChange={onChange}
    />
  );
}
