export { detectDuplicates, type DuplicateCandidate } from './duplicate-detector';
export {
  type StudentListItem,
  type StudentListRow,
  studentNameOrCodeFilter,
  studentPhoneOrCodeFilter,
  type StudentProfile,
  type StudentProfileRow,
  toListItem,
  toProfile,
  toStudentInsert,
  toStudentPatch,
} from './students.mapper';
export { StudentsModule } from './students.module';
