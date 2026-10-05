import type { ReactNode } from 'react';
import type { ColumnFilterDef } from '../data-table-features';

/** One column's filter: its header text, kind, value and setter (`key` = its filter key). */
export interface ColumnFilterControl {
  id: string;
  /** `meta.filterKey ?? column id`: what `DataTableFilters.onClear` receives. */
  key: string;
  label: string;
  filter: ColumnFilterDef;
  value: string;
  onChange: (value: string) => void;
  /** `meta.search`: this text filter is the toolbar's search box. */
  search?: boolean | undefined;
}

/** An active filter under the toolbar: «{label}: {value}», removable on its own. */
export interface FilterChip {
  id: string;
  label: string;
  value: string;
  onRemove: () => void;
}

/** A page's own filters (not column filters) in the same panel and chip row. */
export interface ExtraFilters {
  /** Labelled fields, shown in the panel before the column filters. */
  fields: ReactNode;
  chips: FilterChip[];
  /** «مسح الكل»: the page's own filters and these column filter keys, in one URL change. */
  onClearAll: (columnKeys: string[]) => void;
}

/** DataTable's toolbar options: a page's own search box, extra filters, an action at the end. */
export interface TableToolbarOptions {
  /** The page's own search (e.g. name / phone / code); else a column text filter is the search. */
  search?: ReactNode;
  extra?: ExtraFilters;
  /**
   * The rows the filters leave, for «عرض النتائج (14)» and the screen-reader summary: a server
   * list's `total` (DataTable cannot know it). A `clientFilter` table counts its own rows.
   */
  total?: number | undefined;
  /** After the «تصفية» button, at the inline-end. */
  end?: ReactNode;
}
