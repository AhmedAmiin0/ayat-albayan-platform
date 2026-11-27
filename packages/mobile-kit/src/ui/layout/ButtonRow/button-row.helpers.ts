import { isValidElement, type ReactNode } from 'react';

export const GAP = 8;

/** A Button's `label`, or null for a wrapper whose label the row cannot read (estimated). */
export function labelOf(node: ReactNode): string | null {
  if (!isValidElement(node)) return null;
  const props = node.props as { label?: unknown };
  return typeof props.label === 'string' ? props.label : null;
}

export const hasIcon = (node: ReactNode) =>
  isValidElement(node) && (node.props as { icon?: unknown }).icon !== undefined;
