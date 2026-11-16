import { Avatar, InsetGroup, ListRow, t } from '@ab/mobile-kit';
import { openChildSwitch } from '@/nav';
import { usePickedChild } from '@/portal';

/**
 * «تبديل الطالب» (owner 2026-11-16): a guardian of two or more children sees the child the app
 * works as now; a press opens the children sheet. Nothing for a student or a guardian of one
 * child.
 */
export function SwitchChildRow() {
  const student = usePickedChild();
  if (!student) return null;
  return (
    <InsetGroup>
      <ListRow
        leading={<Avatar name={student.name} id={student.id} size="sm" decorative />}
        title={t.portal.app.pick.switch}
        subtitle={student.name}
        onPress={openChildSwitch}
        accessibilityHint={t.portal.app.pick.title}
      />
    </InsetGroup>
  );
}
