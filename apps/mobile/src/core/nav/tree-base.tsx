import type { Href } from 'expo-router';
import { createContext, type ReactNode, useContext } from 'react';

/**
 * The URL prefix of the tree a shared screen runs in: '' for the admin tabs (and the teacher tree,
 * whose links are already absolute), '/sales' for the salesperson's tabs, '/assistant' for the
 * classroom assistant's. Each tree is its own segment (as /teacher), so its tabs never share a URL
 * with the admin's; the shared screens prefix their links with it instead of forking.
 */
export type TreeBase = '' | '/sales' | '/assistant';

const TreeBaseContext = createContext<TreeBase>('');

export function TreeBaseProvider({ value, children }: { value: TreeBase; children: ReactNode }) {
  return <TreeBaseContext.Provider value={value}>{children}</TreeBaseContext.Provider>;
}

export function useTreeBase(): TreeBase {
  return useContext(TreeBaseContext);
}

/** An admin-tree link (`/inbox/thread/…` or `{ pathname, params }`) moved into this tree. */
export function inTree(base: TreeBase, href: Href): Href {
  if (!base) return href;
  if (typeof href === 'string') return `${base}${href}` as Href;
  return { ...href, pathname: `${base}${href.pathname}` } as Href;
}

/** A student's details in the tree the page runs in: «تفاصيل الطالب» in the sales tree, the admin's
 * student file otherwise. */
export const studentDetailsHref = (base: TreeBase, id: string): Href =>
  base === '/sales' ? `/sales/students/${id}` : `/students/${id}`;

const InChatContext = createContext(false);

/** ChatStack's: the screens below run inside a chat group (app/(admin-chat), (sales-chat), (teacher-chat)). */
export function InChatProvider({ children }: { children: ReactNode }) {
  return <InChatContext.Provider value>{children}</InChatContext.Provider>;
}

/**
 * A tab's student route (`/students/…`, `/sales/students/…`) moved to the chat group's own copy
 * (app/(admin-chat)/inbox/student/…, app/(sales-chat)/sales/inbox/student/…); anything else as is. From a
 * chat group, a push to a tab's route stacks a second tab host above the chat (expo-router PUSHes it at the
 * root), so «رجوع» landed on that host's first tab (owner 2026-10-29); the copy stays in the chat's stack.
 */
export function chatStudentHref(href: Href): Href {
  const move = (path: string) => path.replace(/^(\/sales)?\/students\//, '$1/inbox/student/');
  if (typeof href === 'string') return move(href) as Href;
  return { ...href, pathname: move(href.pathname) } as Href;
}

const asIs = (href: Href): Href => href;

/** The student links of a shared screen: the tab's routes in the tabs, the chat group's copies in a chat. */
export function useStudentHref(): (href: Href) => Href {
  return useContext(InChatContext) ? chatStudentHref : asIs;
}
