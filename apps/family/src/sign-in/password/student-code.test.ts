import { t } from '@ab/mobile-kit';
import { checkStudentCode } from './student-code';

test('a whole code, or one on its way, says nothing', () => {
  for (const typed of ['AB-1234', 'ab-0183', 'AB1234', 'AB-١٢٣٤', 'ab 1234', 'A', 'AB', 'AB-12']) {
    expect(checkStudentCode(typed)).toBeNull();
  }
});

test('anything else says what a student code looks like', () => {
  for (const typed of ['1234', 'B-1234', 'AB-12x', 'name@mail.com']) {
    expect(checkStudentCode(typed)).toBe(t.familyApp.signIn.studentCodeBad);
  }
});
