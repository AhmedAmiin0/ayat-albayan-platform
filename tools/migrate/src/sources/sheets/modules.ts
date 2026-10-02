// Every sheet-side entity module. src/entities/index.ts spreads this list into ENTITY_MODULES
// (leads, message_templates and messages come from the CRM builder).
import type { EntityModule } from '../../entities/contract.ts';
import { jobApplicantsModule } from '../../map/applicants/applicants.ts';
import { expensesModule } from '../../map/expenses/expenses.ts';
import { lessonStudentsModule, lessonsModule } from '../../map/lessons/lessons.ts';
import { paymentsModule, subscriptionsModule } from '../../map/money/subscriptions.ts';
import { guardiansModule } from '../../map/people/guardians.ts';
import { studentsModule } from '../../map/people/students.ts';
import { lessonReportsModule } from '../../map/reports/reports.ts';
import { scheduleRuleStudentsModule, scheduleRulesModule } from '../../map/schedule/rules.ts';
import { teachersModule } from '../../map/teachers/teachers.ts';
import { reportPdfModule } from '../../pdf-import/module.ts';

export const SHEET_MODULES: readonly EntityModule[] = [
  teachersModule,
  guardiansModule,
  studentsModule,
  jobApplicantsModule,
  scheduleRulesModule,
  scheduleRuleStudentsModule,
  lessonsModule,
  lessonStudentsModule,
  lessonReportsModule,
  reportPdfModule,
  subscriptionsModule,
  paymentsModule,
  expensesModule,
];
