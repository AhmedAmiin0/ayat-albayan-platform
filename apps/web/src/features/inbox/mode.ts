import { createContext, useContext } from 'react';

// Teacher mode (R-TCH-03, R-MSG-05): the same inbox under /teacher/inbox. The API scopes the
// threads to the teacher's families and strips the lead / money fields; the UI hides the admin's
// panels and actions. Admin is the default, so /admin/inbox needs no provider.

// Sales mode: scoped by the API like the teacher's, but shown like the admin's (the salesperson sees phones).
export type InboxMode = 'admin' | 'teacher' | 'sales';

export const InboxModeContext = createContext<InboxMode>('admin');

export const useInboxMode = (): InboxMode => useContext(InboxModeContext);

/** Where the list and «رجوع» go (both routes share parseInboxSearch). */
export function inboxBase(mode: InboxMode) {
  if (mode === 'teacher') return '/teacher/inbox' as const;
  return mode === 'sales' ? ('/sales/inbox' as const) : ('/admin/inbox' as const);
}

/** Only a teacher never sees a family's number; admin and sales do. */
export const showsPhone = (mode: InboxMode): boolean => mode !== 'teacher';
