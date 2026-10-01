import type { MouseEvent } from 'react';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { t } from '@/lib/i18n';
import type { StudentListItem } from './types';

type StudentRowActionsProps = { row: StudentListItem; onOpen: (studentId: string) => void };

const iconLink =
  'grid size-[34px] shrink-0 place-items-center rounded-md text-ink-3 transition-colors duration-[120ms] hover:bg-sunk hover:text-ink';

/** Row clicks open the profile; the actions must not trigger it too. */
const own = (e: MouseEvent) => e.stopPropagation();

/**
 * Always-visible row actions (docs/07 §6), named after the row: WhatsApp click-to-chat to the
 * guardian (wa.me fallback, R-MSG-03) and the profile, which is also the keyboard path to it.
 * TODO(R-STU-05): turn ⋮ into a menu once a row has more than one action (pause, assign, merge).
 */
export function StudentRowActions({ row, onOpen }: StudentRowActionsProps) {
  return (
    <div className="flex">
      <a
        href={`https://wa.me/${row.guardian_phone.replace(/^\+/, '')}`}
        target="_blank"
        rel="noreferrer"
        aria-label={t.students.whatsappTo.replace('{name}', row.guardian_name)}
        className={iconLink}
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
        <Icon name="more" />
      </IconButton>
    </div>
  );
}
