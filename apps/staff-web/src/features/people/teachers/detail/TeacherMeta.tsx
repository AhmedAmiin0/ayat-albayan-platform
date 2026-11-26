import { formatPhone } from '@ab/core';
import type { ReactNode } from 'react';
import { Icon, type IconName, Ltr, t } from '@ab/web-kit';
import type { Teacher } from '@ab/shared';

function Item({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <li className="inline-flex items-center gap-[7px]">
      <Icon name={icon} className="size-4 text-ink-3" />
      {children}
    </li>
  );
}

/** docs/07 §8. */
export function TeacherMeta({ teacher }: { teacher: Teacher }) {
  const role = [
    t.teachers.genderLabel[teacher.gender],
    ...teacher.programs.map((p) => t.enums.program[p]),
  ];
  return (
    <ul className="mb-[18px] flex flex-wrap gap-x-[22px] gap-y-1.5 text-xs text-ink-2">
      <Item icon="teacher">
        <span>{role.join(t.common.listSeparator)}</span>
      </Item>
      {teacher.phone_e164 && (
        <Item icon="phone">
          <Ltr>{formatPhone(teacher.phone_e164)}</Ltr>
        </Item>
      )}
      {teacher.max_students !== null && (
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
