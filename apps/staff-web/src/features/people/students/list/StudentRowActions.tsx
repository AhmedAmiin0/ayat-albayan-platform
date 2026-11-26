import type { MouseEvent } from 'react';
import { clickToChatLink } from '@ab/core';
import { Icon, IconButton, iconButtonClass, t } from '@ab/web-kit';
import type { StudentListItem } from '@ab/shared';

type StudentRowActionsProps = { row: StudentListItem; onOpen: (studentId: string) => void };

/** Row clicks open the profile; the actions must not trigger it too. */
const own = (e: MouseEvent) => e.stopPropagation();

/** Always-visible row actions named after the row (docs/07 §6, R-MSG-03). */
export function StudentRowActions({ row, onOpen }: StudentRowActionsProps) {
  return (
    <div className="flex">
      <a
        href={clickToChatLink(row.guardian_phone)}
        target="_blank"
        rel="noreferrer"
        aria-label={t.students.whatsappTo.replace('{name}', row.guardian_name)}
        className={iconButtonClass}
        onClick={own}
      >
        <Icon name="chat" />
      </a>
      <IconButton
        label={t.students.openProfile.replace('{name}', row.name)}
        onClick={(e) => {
          own(e);
          onOpen(row.id);
        }}
      >
        <Icon name="chevron-left" />
      </IconButton>
    </div>
  );
}
