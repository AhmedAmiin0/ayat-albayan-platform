import type { AnyRouter } from '@tanstack/react-router';

export interface MaintenanceOptions {
  /** The staff app: admins pass the switch; the family app never passes it. */
  staff?: boolean | undefined;
  /** Lesson-room paths: never covered (the family room is an overlay, counted by holdRoomOpen). */
  rooms?: RegExp | undefined;
  /** Sign-in paths, open to anyone with the switch on so an admin can still get in. */
  signIn?: RegExp | undefined;
}

export interface MaintenanceWatch extends MaintenanceOptions {
  router: AnyRouter;
}
