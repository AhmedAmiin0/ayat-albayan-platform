export { detectDuplicates, type DuplicateCandidate } from './duplicate-detector';
export {
  type StudentListRow,
  studentNameOrCodeFilter,
  studentPhoneOrCodeFilter,
  type StudentProfileRow,
  toListItem,
  toProfile,
  toStudentInsert,
  toStudentPatch,
} from './students.mapper';
export { StudentsModule } from './students.module';
export { StudentsService } from './students.service';
