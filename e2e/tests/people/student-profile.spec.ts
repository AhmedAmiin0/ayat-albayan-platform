import { ar, expect, test } from '../../support/core/fixtures';
import { dropTeacher, insertTeacher, statusAudits, studentIdsOf, studentRow } from '../../support/people/admin-extra';
import { seedFamily } from '../../support/schedule';

// R-STU-04/05: the profile form edits every field (labels from ar.students, so forms parity does
// not break it), a status change is audited, and the effective link falls back to the teacher's.
// Not covered because the UI has no such element: a StatusChanger, a separate note box, a timeline.

const STAMP = Date.now() % 1_000_000;
const NAME = `ملف الطالب ${STAMP}`;
const SIBLING = `أخو الملف ${STAMP}`;
const TEACHER_LINK = `https://meet.jit.si/ab-profile-${STAMP}`;
const OVERRIDE = `https://meet.google.com/ab-${STAMP}`;

test.describe('student profile (R-STU-05)', () => {
  test('edit every field, status change is audited, the link defaults to the teacher then the override', async ({ asRole }) => {
    const family = await seedFamily('أم الملف', [NAME]);
    const studentId = family.studentIds[0] ?? '';
    const teacherId = await insertTeacher({ name: `معلمة الملف ${STAMP}`, meetingLink: TEACHER_LINK });
    try {
      const page = await asRole('admin');
      await page.goto(`/admin/students/${studentId}`);
      await expect(page.getByRole('heading', { level: 1, name: NAME })).toBeVisible();
      await expect(page.getByText(/^AB-\d{4,}$/)).toBeVisible();
      const link = (url: string) => page.getByRole('link', { name: url.replace(/^https?:\/\//, '') });
      await expect(page.getByText(ar.students.effectiveLink)).toBeVisible();

      const field = (label: string) => page.getByLabel(label, { exact: true });
      await field(ar.students.age).fill('12');
      await field(ar.students.gender).selectOption('female');
      await field(ar.students.status).selectOption('active');
      await field(ar.students.teacher).selectOption(teacherId);
      await field(ar.students.program).selectOption('arabic');
      await field(ar.students.level).fill('يقرأ بتهجّي');
      await field(ar.students.memorized).fill('جزء عمّ');
      await field(ar.students.goal).fill('الحفظ مع التجويد');
      await field(ar.students.riwaya).fill('حفص');
      await field(ar.students.tz).selectOption('Africa/Cairo');
      await field(ar.students.notes).fill('ملاحظة من الإدارة');
      await page.getByRole('button', { name: ar.common.save, exact: true }).click();
      await expect(page.getByText(ar.students.updated)).toBeVisible();

      const saved = await studentRow(studentId);
      expect(saved).toMatchObject({
        age: 12, gender: 'female', status: 'active', teacher_id: teacherId, program: 'arabic',
        level: 'يقرأ بتهجّي', memorized: 'جزء عمّ', goal: 'الحفظ مع التجويد', riwaya: 'حفص',
        tz: 'Africa/Cairo', notes: 'ملاحظة من الإدارة', meeting_link_override: null,
      });
      await expect(page.getByText(ar.enums.studentStatus.active, { exact: true }).first()).toBeVisible();
      expect(await statusAudits(studentId)).toEqual(['active']);
      // No override: the teacher's link is the one the guardian gets.
      await expect(link(TEACHER_LINK)).toBeVisible();

      await field(ar.students.meetingLink).fill(OVERRIDE);
      await page.getByRole('button', { name: ar.common.save, exact: true }).click();
      await expect(link(OVERRIDE)).toBeVisible();
      expect((await studentRow(studentId))?.meeting_link_override).toBe(OVERRIDE);
      expect(await statusAudits(studentId)).toEqual(['active']); // unchanged status: no new audit row

      await page.reload();
      await expect(field(ar.students.notes)).toHaveValue('ملاحظة من الإدارة');
      await expect(field(ar.students.status)).toHaveValue('active');
    } finally {
      await dropTeacher(teacherId);
    }
  });

  test('a sibling on the same guardian phone is listed and merged into this student', async ({ asRole }) => {
    const family = await seedFamily('أم الإخوة', [NAME, SIBLING]);
    const [keptId = '', siblingId = ''] = family.studentIds;
    const page = await asRole('admin');
    await page.goto(`/admin/students/${keptId}`);
    const section = page.locator('section').filter({ has: page.getByRole('heading', { name: ar.students.siblings }) });
    const row = section.getByRole('listitem').filter({ hasText: SIBLING });
    await expect(row).toHaveCount(1);
    await expect(section.getByRole('listitem')).toHaveCount(1);

    await row.getByRole('button', { name: ar.students.mergeIntoThis }).click();
    const dialog = page.getByRole('dialog', { name: ar.students.mergeTitle });
    await expect(dialog).toContainText(SIBLING);
    await dialog.getByRole('button', { name: ar.common.confirm }).click();
    await expect(page.getByText(ar.students.mergeDone)).toBeVisible();
    await expect(section.getByRole('listitem')).toHaveCount(0);
    expect(await studentIdsOf(family.guardianId)).toEqual([keptId]);
    expect(await studentRow(siblingId)).toBeUndefined();
  });
});
