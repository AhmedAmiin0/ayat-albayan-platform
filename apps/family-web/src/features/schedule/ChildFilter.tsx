import type { PortalStudent } from '@ab/shared';
import { SegmentedControl } from '@ab/web-kit/components/ui/form/segmented-control';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const ALL = 'all';

interface Props {
  students: readonly PortalStudent[];
  only: string | null;
  onOnly: (id: string | null) => void;
}

/** «الكل» or one child: a guardian of several only. */
export function ChildFilter({ students, only, onOnly }: Props) {
  if (students.length < 2) return null;
  const options = [
    { value: ALL, label: t.portal.app.schedule.all },
    ...students.map((s) => ({ value: s.id, label: s.name })),
  ];
  return (
    <SegmentedControl
      label={t.portal.app.schedule.filter}
      options={options}
      value={only ?? ALL}
      onChange={(value) => onOnly(value === ALL ? null : value)}
    />
  );
}
