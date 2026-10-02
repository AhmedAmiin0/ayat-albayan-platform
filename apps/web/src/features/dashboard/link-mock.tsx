import type { ReactNode } from 'react';

// Test helper (not a test): a plain <a> standing in for TanStack Router's <Link>, with the path
// params filled in and the search (object or updater) as the query string, so tests can read href.

type Search = Record<string, unknown>;
interface LinkProps {
  to: string;
  params?: Record<string, string>;
  search?: Search | ((prev: Search) => Search);
  activeOptions?: object;
  children?: ReactNode;
  className?: string;
  'aria-current'?: 'true' | undefined;
  'aria-label'?: string;
}

export function Link({ to, params = {}, search, children, className, ...aria }: LinkProps) {
  const s = typeof search === 'function' ? search({}) : (search ?? {});
  const path = Object.entries(params).reduce((p, [k, v]) => p.replace(`$${k}`, v), to);
  const query = new URLSearchParams(
    Object.entries(s)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)]),
  ).toString();
  return (
    <a href={query ? `${path}?${query}` : path} className={className} aria-current={aria['aria-current']} aria-label={aria['aria-label']}>
      {children}
    </a>
  );
}
