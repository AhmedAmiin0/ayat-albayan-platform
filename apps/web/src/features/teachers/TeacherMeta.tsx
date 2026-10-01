import { formatPhone } from '@ab/shared';
import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
import { Ltr } from '@/components/ui/ltr';
import { t } from '@/lib/i18n';
import type { Teacher } from './api';

function Item({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <li className="inline-flex items-center gap-[7px]">
      <Icon name={icon} className="size-4 text-ink-3" />
      {children}
    </li>
  );
}

/**
 * Meta line under the cartouche (docs/07 §8): «معلمة، تحفيظ وتجويد», LTR phone, capacity, link.
 * TODO(R-TCH-03): «9 طلاب من أقصى 12» once the API returns the teacher's student count.
 */
export function TeacherMeta({ teacher }: { teacher: Teacher }) {
  const role = [t.teachers.genderLabel[teacher.gender], ...teacher.programs.map((p) => t.enums.program[p])];
  return (
    <ul className="mb-[18px] flex flex-wrap gap-x-[22px] gap-y-1.5 text-xs text-ink-2">
      <Item icon="teacher">
        <span>{role.join(t.teachers.listSeparator)}</span>
      </Item>
      {teacher.phone_e164 && (
        <Item icon="phone">
          <Ltr>{formatPhone(teacher.phone_e164)}</Ltr>
        </Item>
      )}
      {teacher.max_students !== null && teacher.max_students !== undefined && (
        <Item icon="users">
          <span>
            {t.teachers.maxStudents} <span className="tabular-nums">{teacher.max_students}</span>
          </span>
        </Item>
      )}
      {teacher.meeting_link && (
        <Item icon="globe">
          <a
            href={teacher.meeting_link}
            target="_blank"
            rel="noreferrer"
            dir="ltr"
            className="text-lapis underline underline-offset-4 [overflow-wrap:anywhere]"
          >
            {teacher.meeting_link.replace(/^https?:\/\//, '')}
          </a>
        </Item>
      )}
    </ul>
  );
}
