import type { PeopleDone } from '@ab/client-core';
import type { PeopleEditView } from '@ab/shared';

/** Every people dialog: its loaded edit view, close, and the success notice (caller shows it). */
export interface PeopleDialogProps {
  view: PeopleEditView;
  onClose: () => void;
  onDone: PeopleDone;
}
