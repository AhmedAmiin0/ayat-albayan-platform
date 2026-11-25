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
  return { ...href, pathname: `${base}${href.pathname}` };
}

/** The sales tree opens student details, otherwise the admin's student file. */
export const studentDetailsHref = (base: TreeBase, id: string): Href =>
  base === '/sales' ? `/sales/students/${id}` : `/students/${id}`;

const InChatContext = createContext(false);

/** ChatStack's: the screens below run inside a chat group (app/(admin-chat), (sales-chat), (teacher-chat)). */
export function InChatProvider({ children }: { children: ReactNode }) {
  return <InChatContext.Provider value>{children}</InChatContext.Provider>;
}

/** A push from a chat group stacks a second tab host at the root, so the chat's copy keeps back. */
export function chatStudentHref(href: Href): Href {
  const move = (path: string) => path.replace(/^(\/sales)?\/students\//, '$1/inbox/student/');
  if (typeof href === 'string') return move(href);
  return { ...href, pathname: move(href.pathname) };
}

const asIs = (href: Href): Href => href;

/** Whether the screen runs inside a chat group (its stack already holds the chat). */
export const useInChat = (): boolean => useContext(InChatContext);

/** The student links of a shared screen: the tab's routes in the tabs, the chat group's copies in a chat. */
export function useStudentHref(): (href: Href) => Href {
  return useContext(InChatContext) ? chatStudentHref : asIs;
}
