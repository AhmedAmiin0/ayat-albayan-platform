import { createContext, useContext } from 'react';

// Teacher mode (R-TCH-03, R-MSG-05): the same inbox under /teacher/inbox. The API scopes the
// threads to the teacher's families and strips the lead / money fields; the UI hides the admin's
// panels and actions. Admin is the default, so /admin/inbox needs no provider.

export type InboxMode = 'admin' | 'teacher';

export const InboxModeContext = createContext<InboxMode>('admin');

export const useInboxMode = (): InboxMode => useContext(InboxModeContext);

/** Where the list and «رجوع» go (both routes share parseInboxSearch). */
export const inboxBase = (mode: InboxMode) => (mode === 'teacher' ? ('/teacher/inbox' as const) : ('/admin/inbox' as const));
