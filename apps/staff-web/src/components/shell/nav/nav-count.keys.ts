// The count sits under its feature's root, so the feature's own invalidation refreshes the badge.
export const navCountKey = (prefix: string, path: string): readonly unknown[] => [
  prefix,
  'nav-count',
  path,
];
