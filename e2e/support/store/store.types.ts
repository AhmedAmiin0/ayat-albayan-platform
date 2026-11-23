export interface DemoReport {
  recited: string;
  newMemorization: string;
  revision: string;
  notes: string;
  homework: string;
  nextPlan: string;
  overall: 'excellent' | 'very_good';
}

export interface DemoLesson {
  startsAt: Date;
  done: boolean;
  report?: DemoReport;
}

export interface StoreFamily {
  phone: string;
  first: { id: string; name: string };
  second: { id: string; name: string };
  /** The instant the browsers' clock stays on: the countdown and «today» never move. */
  frozenAt: Date;
  /** The academy week (Saturday to Friday) of the next lesson: this one, or the next one. */
  week: 'this' | 'next';
}

export type Shot =
  | '01-home'
  | '02-schedule'
  | '03-report'
  | '04-package'
  | '05-children'
  | '06-home-dark'
  | '07-reports'
  | '08-alerts';
