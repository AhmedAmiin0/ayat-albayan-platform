import type { PeopleDone } from '@ab/client-core';
import type { PeopleEditView } from '@ab/shared';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ComponentType } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more';
import { PauseSheetFrame } from '@/students/course-pause/PauseSheetFrame';

/** What every sheet gets: the loaded view, close, and the success notice. */
export interface PeopleSheetProps {
  view: PeopleEditView;
  onClose: () => void;
  onDone: PeopleDone;
}

/** One action's sheet and its title. */
export interface PeopleSheetEntry {
  label: string;
  Sheet: ComponentType<PeopleSheetProps>;
}

interface PeopleSheetHostProps extends Omit<PeopleSheetProps, 'view'> {
  /** The open action, or null (closed). */
  sheet: PeopleSheetEntry | null;
  view: UseQueryResult<PeopleEditView>;
}

/** The page sheet of the open people action, over the loaded edit view (or its load error). */
export function PeopleSheetHost({ sheet, view, onClose, onDone }: PeopleSheetHostProps) {
  const body =
    sheet && view.data ? <sheet.Sheet view={view.data} onClose={onClose} onDone={onDone} /> : null;
  return (
    <PauseSheetFrame open={sheet !== null} title={sheet?.label ?? ''} onClose={onClose}>
      {body}
      {view.isError ? <Note alert>{t.peopleEdit.errors.generic}</Note> : null}
    </PauseSheetFrame>
  );
}
