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
