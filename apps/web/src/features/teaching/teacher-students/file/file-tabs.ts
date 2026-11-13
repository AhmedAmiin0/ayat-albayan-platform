/** The student file's panes (docs/47), bound to `?tab=`: «الحلقات» (default) | «التقارير». */
export const FILE_TABS = ['lessons', 'reports'] as const;

export type FileTab = (typeof FILE_TABS)[number];
