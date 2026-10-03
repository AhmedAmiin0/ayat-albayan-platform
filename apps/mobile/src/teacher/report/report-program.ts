import type { Program, ReportView } from '@ab/shared';

// «البرنامج *» is a choice on the form (القرآن الكريم / اللغة العربية / الدراسات الإسلامية), prefilled
// from the student's program. ponytail: stand-in until packages/shared carries `program` in
// FormValues / DraftBody / ReportView: it rides next to them in the same bodies (`{ ...body,
// program }`), and the API strips a key it does not know yet. Fold it into FormValues
// (valuesOf, draftBody) once it does.

/** The saved program of the report if the API sent one, else the student's own. */
export function programOf(report: ReportView, fallback: Program): Program {
  const saved = (report as { program?: Program | null }).program;
  return saved ?? fallback;
}
