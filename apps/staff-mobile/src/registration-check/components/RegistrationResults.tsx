import type { RegistrationCheckView, RegistrationMatch } from '@ab/shared';
import { studentStatusStyle } from '@ab/money';
import { t, EmptyState, ListRow, StatusChip, InsetGroup, Section } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import type { RegistrationCheckBy } from '@ab/shared';

/**
 * The answer: the registered count and each child (name, code, status — any of the eight, expired
 * and churned included —, teacher or a no-teacher-yet line), a first-10-only note when there were
 * more; else the not-found line for the mode searched. With `onPick` each child is a button (the
 * link-family picker).
 */
export function RegistrationResults({ view, by, onPick }: {
  view: RegistrationCheckView;
  by: RegistrationCheckBy;
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
