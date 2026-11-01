import { studentStatusStyle, type RegistrationCheckView, type RegistrationMatch } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { Section } from '@/core/ui/surface/Section';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ListRow } from '@/core/ui/layout/ListRow';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import type { CheckBy } from '@/registration-check/lib/registration-check';
import { InsetGroup } from '@/core/ui/surface/inset';

/**
 * The answer: «مسجّل: n طالب» and each child (name, code, status — any of the eight, expired and churned
 * included —, teacher or «لم يُحدَّد معلم بعد»), «أول 10 نتائج فقط» when there were more; else
 * «لا يوجد طالب…» for the mode searched. With `onPick` each child is a button (the link-family picker).
 */
export function RegistrationResults({ view, by, onPick }: {
  view: RegistrationCheckView;
  by: CheckBy;
  onPick?: (m: RegistrationMatch) => void;
}) {
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
            // In the picker the code is what tells two children of the same name apart.
            metaStrong={!!onPick}
            subtitle={`${rc.teacher}: ${m.teacher_name ?? rc.noTeacher}`}
            trailing={<StatusChip {...studentStatusStyle[m.status]} label={t.enums.studentStatus[m.status]} size="sm" />}
            onPress={onPick ? () => onPick(m) : undefined}
            accessibilityHint={onPick ? t.inbox.linkFamily.pickHint : undefined}
          />
        ))}
      </InsetGroup>
      {view.more ? <Note>{rc.more}</Note> : null}
    </Section>
  );
}
