import type { ReportLine } from '@ab/client-core';

/** Where a line of the report sits on the family's report page (boards: PortalWebReport). */
type Place = 'attendance' | 'overall' | 'todo' | 'note' | 'content';

const PLACE: Readonly<Record<string, Place>> = {
  attendance: 'attendance',
  overall: 'overall',
  homework: 'todo',
  nextPlan: 'todo',
  note: 'note',
};

const placeOf = (line: ReportLine): Place => PLACE[line.key] ?? 'content';

/** The report's lines laid out as the board's cards, each line once, in the form's order. */
export interface ReportCards {
  /** The hero's chip («حضر في الموعد»). */
  attendance: ReportLine | null;
  /** The hero's arch («التقدير العام»). */
  overall: ReportLine | null;
  /** «محتوى الحلقة»: the program and what was read. */
  content: ReportLine[];
  /** «ما المطلوب للحلقة القادمة»: homework and the next plan. */
  todo: ReportLine[];
  /** «ملاحظات المعلم/ة». */
  note: ReportLine | null;
}

/** Splits the page's lines (@ab/client-core pageLines) into the hero and the cards. */
export function reportCards(lines: readonly ReportLine[]): ReportCards {
  const at = (place: Place) => lines.filter((line) => placeOf(line) === place);
  return {
    attendance: at('attendance')[0] ?? null,
    overall: at('overall')[0] ?? null,
    content: at('content'),
    todo: at('todo'),
    note: at('note')[0] ?? null,
  };
}
