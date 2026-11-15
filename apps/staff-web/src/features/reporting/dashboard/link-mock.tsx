import type { MouseEventHandler, ReactNode } from 'react';

// Test helper (not a test): a plain <a> standing in for TanStack Router's <Link>, with the path
// params filled in, the search (object or updater) as the query string and the hash, so tests can
// read href.

type Search = Record<string, unknown>;
interface LinkProps {
  to: string;
  params?: Record<string, string>;
  search?: Search | ((prev: Search) => Search);
  hash?: string;
  activeOptions?: object;
  children?: ReactNode;
  className?: string;
  'aria-current'?: 'true' | undefined;
  'aria-label'?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export function Link(props: LinkProps) {
  const { to, params = {}, search, hash, children, className, onClick, ...aria } = props;
  const s = typeof search === 'function' ? search({}) : (search ?? {});
  const path = Object.entries(params).reduce((p, [k, v]) => p.replace(`$${k}`, v), to);
  const query = new URLSearchParams(
    Object.entries(s)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)]),
  ).toString();
  const href = `${path}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
  return (
    <a href={href} className={className} aria-current={aria['aria-current']} aria-label={aria['aria-label']} onClick={onClick}>
      {children}
    </a>
  );
}
