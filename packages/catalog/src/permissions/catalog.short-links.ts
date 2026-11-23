// Managed short links (docs/19 «Short links»): sales and the admin make links;
// short_links.all (admin by default) sees and edits every link, without it only one's own.
export const SHORT_LINK_ROWS = [
  { key: 'short_links.manage', area: 'messaging', grants: ['sales'] },
  { key: 'short_links.all', area: 'messaging', grants: [] },
] as const;
