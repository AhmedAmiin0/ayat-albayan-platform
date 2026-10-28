import { studentStatusStyle, type RegistrationCheckView } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { Section } from '@/more/Section';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ListRow } from '@/core/ui/layout/ListRow';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import type { CheckBy } from '../lib/registration-check';
import { InsetGroup } from '@/core/ui/surface/inset';

/**
 * The answer: «مسجّل: n طالب» and each child (name, code, status — any of the eight, expired and churned
 * included —, teacher or «لم يُحدَّد معلم بعد»), «أول 10 نتائج فقط» when there were more; else
 * «لا يوجد طالب…» for the mode searched.
 */
export function RegistrationResults({ view, by }: { view: RegistrationCheckView; by: CheckBy }) {
  const rc = t.registrationCheck;
  if (!view.found) return <EmptyState title={by === 'phone' ? rc.notFoundPhone : rc.notFoundName} />;
  return (
    <Section title={rc.found.replace('{n}', String(view.matches.length))}>
      <InsetGroup>
        {view.matches.map((m) => (
          <ListRow
            key={m.code}
            title={m.name}
            meta={m.code}
            subtitle={`${rc.teacher}: ${m.teacher_name ?? rc.noTeacher}`}
            trailing={<StatusChip {...studentStatusStyle[m.status]} label={t.enums.studentStatus[m.status]} size="sm" />}
          />
        ))}
      </InsetGroup>
      {view.more ? <Note>{rc.more}</Note> : null}
    </Section>
  );
}
