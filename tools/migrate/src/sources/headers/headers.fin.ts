// FIN «Main income statment.xlsx» + «Augest cost/» expenses tracker.
import { FIN_FILE } from './headers.common.ts';
import type { SheetSpec } from './headers.ts';

// Free-form income statement, one tab per month (general = August, sept). Blank headers → letters.
// A/B: summary label/value · C/D: teacher + staff cost · E/F: revenue + students · G: ads ·
// H/I: other expense + description → expenses (G, H) and revenue hints for payments (E/F).
const STATEMENT = {
  '@A': 'summary_label',
  '@B': 'summary_value',
  '@C': 'staff_name',
  'Staff Expenses': 'staff_amount',
  Revenue: 'revenue_amount',
  Desc: 'revenue_desc',
  ADS: 'ads_amount',
  'other Expenses': 'other_amount',
  DESC: 'other_desc',
};

/** A1 holds the sheet title; column A is read by letter. */
const TITLE = ['قائمة الدخل — Income Statement'];

// Customer list (row 1 title, row 3 header; letters skip merged columns). Same table as
// «Augest cost/Customers.XLSX», which is excluded.
const CUSTOMERS = {
  name: 'name',
  'Phone number': 'phone',
  age: 'age',
  lectures: 'lessons',
  Status: 'paid_status',
  Teacher: 'teacher',
};

export const FIN_SHEETS: SheetSpec[] = [
  {
    id: 'fin_aug',
    source: 'FIN',
    file: FIN_FILE,
    tab: 'general',
    headerRow: 1,
    fields: STATEMENT,
    ignore: TITLE,
  },
  {
    id: 'fin_sept',
    source: 'FIN',
    file: FIN_FILE,
    tab: 'sept',
    headerRow: 1,
    fields: STATEMENT,
    ignore: TITLE,
  },
  {
    id: 'fin_customers',
    source: 'FIN',
    file: FIN_FILE,
    tab: 'Sheet3',
    headerRow: 3,
    fields: CUSTOMERS,
  },
  {
    id: 'fin_expenses_tracker',
    source: 'FIN',
    file: 'Augest cost/Ayat_Al_Bayan_Expenses_Tracker.xlsx',
    tab: 'Expenses Tracker',
    headerRow: 3,
    fields: {
      Date: 'date',
      Expense: 'expense',
      Category: 'category',
      'Amount (EGP)': 'amount_egp',
      Status: 'status',
      'Paid To': 'paid_to',
      Notes: 'notes',
    },
  },
];
