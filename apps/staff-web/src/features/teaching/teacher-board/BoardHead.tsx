import { ColumnFilterText } from '@/components/data-table/ColumnFilterText';
import { SegmentedControl } from '@/components/ui/form/segmented-control';
import { t } from '@/lib/i18n/i18n';
import { BOARD_SEGMENTS, SEGMENT_LABEL, type BoardSegment } from './board-segments';

export interface BoardHeadProps {
  segment: BoardSegment;
  counts: Record<BoardSegment, number>;
  onSegment: (segment: BoardSegment) => void;
  search: { q: string; onSearch: (q: string) => void };
}

/**
 * The board head (docs/48): «مشترك n · تجريبي n · الكل n», then one search box matching name,
 * code and facts. One row from 640px; at 390px the search takes the full width.
 */
export function BoardHead({ segment, counts, onSegment, search }: BoardHeadProps) {
  const options = BOARD_SEGMENTS.map((value) => ({
    value,
    label: SEGMENT_LABEL[value],
    count: counts[value],
  }));
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <SegmentedControl
        label={t.teacherBoard.kinds}
        options={options}
        value={segment}
        onChange={onSegment}
      />
      <div className="w-full sm:w-72">
        <ColumnFilterText
          ariaLabel={t.teacherBoard.searchLabel}
          placeholder={t.teacherBoard.search}
          value={search.q}
          onChange={search.onSearch}
        />
      </div>
    </div>
  );
}
