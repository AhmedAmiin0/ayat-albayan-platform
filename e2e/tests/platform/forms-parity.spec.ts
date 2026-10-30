import type { Locator, Page } from '@playwright/test';
import { ar, expect, test } from '../../support/fixtures';
import { seedPackageStudent } from '../../support/finance/money';
import { resetAbrar, seedFamily, setAvailability } from '../../support/schedule';

// Forms parity (owner 2026-10-03, "THESE ARE ALL OUR FORMS"): each form in the app shows the Google
// Form's titles, options, order and stars. The expected text is typed here from the owner's paste on
// purpose (never read from ar.json: that would only compare the file with itself). Deliberate
// differences are marked «DEVIATION».

const GRADES = ['ممتاز', 'جيد جدًا', 'جيد', 'مقبول', 'يحتاج إلى مراجعة'];
const DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

/** The titles appear in this order on the page. */
async function expectOrder(scope: Locator, titles: string[]): Promise<void> {
  const text = (await scope.innerText()).replace(/\s+/g, ' ');
  const at = titles.map((x) => text.indexOf(x));
  expect(at, titles.join(' | ')).not.toContain(-1);
  expect(at).toEqual([...at].sort((a, b) => a - b));
}

const optionTexts = (select: Locator) => select.locator('option').allInnerTexts();
const radioNames = (scope: Locator) => scope.getByRole('radio').evaluateAll((els) => els.map((e) => e.closest('label')?.textContent?.trim()));

test.describe('forms parity (owner’s three Google Forms)', () => {
  test('1 · «إضافة طالب»: name, WhatsApp, age, gender, teacher, source', async ({ asRole }) => {
    const admin = await asRole('admin');
    await admin.goto('/admin/students');
    await admin.getByRole('button', { name: 'إضافة طالب' }).click();
    const dialog = admin.getByRole('dialog');
    await expectOrder(dialog, ['اسم الطالب', 'رقم الواتساب (مع رمز الدولة)', 'عمر الطالب', 'النوع', 'المعلم/المعلمة', 'كيف عرفت عنا؟']);
    await expect(dialog.getByLabel('رقم الواتساب (مع رمز الدولة)')).toHaveAttribute('aria-required', 'true');
    expect(await optionTexts(dialog.getByLabel('النوع'))).toEqual(['—', 'ذكر', 'أنثى']);
    expect(await optionTexts(dialog.getByLabel('كيف عرفت عنا؟'))).toEqual([
      '—',
      'إعلان فيسبوك',
      'إعلان انستجرام',
      'واتساب مباشر',
      'صديق أو معرفة',
    ]);
    // DEVIATION: the teachers come from the database (not the Google Form's fixed 11 Latin names);
    // the empty first option is the form's «(خيار فاضي)».
    const teachers = await optionTexts(dialog.getByLabel('المعلم/المعلمة'));
    expect(teachers[0]).toBe(ar.students.noTeacher);
    expect(teachers).toContain('أبرار');
  });

  test('1 · the booking wizard: days, hour, date, teacher, duration, package', async ({ asRole }) => {
    test.setTimeout(120_000);
    const teacherId = await resetAbrar();
    await setAvailability(teacherId, [[3, '16:00', '18:00']]);
    const family = await seedFamily('أم سارة', ['سارة']);
    const admin: Page = await asRole('admin');
    await admin.goto(`/admin/book?studentId=${family.studentIds[0] ?? ''}`);
    // «نوع الحجز» (beyond the Google Form): trial / subscription / makeup, and the trial left the package list.
    const kinds = admin.getByRole('group', { name: ar.booking.kind.label });
    await expect(kinds).toBeVisible();
    expect(await kinds.getByRole('radio').evaluateAll((els) => els.map((e) => e.closest('label')?.textContent?.trim()))).toEqual([
      ar.booking.kind.trial,
      ar.booking.kind.package,
      ar.booking.kind.makeup,
    ]);
    await admin.getByRole('button', { name: ar.booking.next }).click();

    // المعلم/المعلمة
    await expect(admin.getByRole('group', { name: 'المعلم/المعلمة' })).toBeVisible();
    await admin.getByRole('radio', { name: /أبرار/ }).check();
    await admin.getByRole('button', { name: ar.booking.next }).click();

    // المدة (30/45/60/90 دقيقة) and الباقة المطلوبة * (the form's options; DEVIATION: 20/28 stay in the DB only, the trial moved to «نوع الحجز»).
    expect(await optionTexts(admin.getByLabel('المدة'))).toEqual(['30 دقيقة', '45 دقيقة', '60 دقيقة', '90 دقيقة']);
    const pkg = admin.getByRole('group', { name: 'الباقة المطلوبة' });
    await expect(pkg.locator('legend')).toHaveText(/الباقة المطلوبة\s*\*/);
    // The first span of each option is its name; the price follows in the next one.
    expect(await pkg.locator('label').evaluateAll((els) => els.map((e) => e.querySelector('span')?.textContent?.trim()))).toEqual([
      '4 حلقات في الشهر',
      '8 حلقات',
      '12 حلقة',
      '16 حلقة في الشهر',
    ]);
    await admin.getByRole('button', { name: ar.booking.next }).click();

    // الساعة * / تاريخ أول حلقة / الأيام المتاحة * (السبت → الجمعة). DEVIATION: the hour and the date
    // are picked from the teacher's free slots (never typed), as one control.
    const step = admin.getByRole('region', { name: ar.booking.steps.slot });
    await expect(step.getByRole('heading', { name: 'الساعة' })).toBeVisible();
    await step.getByRole('button', { name: ar.schedule.nextWeek }).click();
    await step.getByRole('group', { name: ar.booking.freeSlots }).getByRole('button').first().click();
    await expect(step.getByRole('heading', { name: 'تاريخ أول حلقة' })).toBeVisible();
    // DEVIATION (owner 2026-10-18): each day is picked on the slot grid with its own time (السبت →
    // الجمعة columns); the picked days are listed under «الأيام المتاحة» *, each removable.
    const columns = step.getByRole('group', { name: ar.booking.freeSlots }).getByRole('region');
    expect((await columns.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''))).map((l) => l.split(' ')[0])).toEqual(DAYS);
    const days = step.getByRole('region', { name: /الأيام المتاحة/ });
    await expect(days.getByRole('heading')).toContainText('*');
    await expect(days.getByRole('button', { name: new RegExp(ar.booking.removeDay.replace('{day}', '')) })).toHaveCount(1);
  });

  test('2 · «تقرير الحلقة»: sections, titles, options and order', async ({ asRole }) => {
    test.setTimeout(120_000);
    const teacherId = await resetAbrar();
    const seed = await seedPackageStudent({ teacherId, paid: true, guardian: 'أم سهيلة', student: 'سهيلة' });
    const page = await asRole('teacher');
    await page.goto(`/teacher/report/${seed.todayLessonId}`);

    const identity = page.getByRole('region', { name: 'بيانات الحلقة' });
    await expectOrder(identity, [
      'معرّف الطالب (لا تعدله)',
      'اسم المعلم (لا تعدله)',
      'اسم الطالب (لا تعدله)',
      'تاريخ الحلقة',
      'رقم الحلقة',
      'البرنامج',
      'الحضور',
      'رابط الاجتماع',
    ]);
    await expect(identity).toContainText('AB-');
    // DEVIATION: the id, teacher, student, date, number and link are read-only (filled from the lesson).
    await expect(identity.getByRole('textbox')).toHaveCount(0);
    expect(await radioNames(identity.getByRole('group', { name: 'البرنامج' }))).toEqual([
      'القرآن الكريم',
      'اللغة العربية',
      'الدراسات الإسلامية',
    ]);
    expect(await radioNames(identity.getByRole('group', { name: 'الحضور' }))).toEqual([
      'حضرت في الموعد',
      'حضرت متأخرة',
      'اعتذرت مسبقًا',
      'غياب بدون إشعار',
    ]);

    await expect(page.getByRole('heading', { name: 'محتوى الحلقة' })).toBeVisible();
    await expectOrder(page.getByRole('region', { name: 'محتوى الحلقة' }), ['التسميع (المُسمَّع)', 'الحفظ الجديد', 'المراجعة', 'الدرس النظري / أحكام التجويد']);

    const detail = page.getByRole('region', { name: 'التقييم التفصيلي' });
    await expectOrder(detail, ['تقييم البنود', 'التلاوة والنطق', 'الحفظ الجديد', 'المراجعة', 'التجويد', 'الاستيعاب والتفاعل', 'الالتزام والحضور', 'التقدير العام للحلقة']);
    for (const row of ['التلاوة والنطق', 'التجويد', 'الالتزام والحضور', 'التقدير العام للحلقة']) {
      const names = await detail.getByRole('group', { name: row }).getByRole('radio').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
      expect(names, row).toEqual(GRADES);
    }

    const notes = page.getByRole('region', { name: 'الملاحظات والواجب' });
    await expectOrder(notes, ['ملاحظات المعلمة', 'الواجب المطلوب قبل الحلقة القادمة', 'خطة الحلقة القادمة', 'المرفقات (اختياري)']);
    // The Google Form's required fields carry the star (attendance is still open, so all apply).
    for (const title of ['التسميع (المُسمَّع)', 'الحفظ الجديد', 'المراجعة', 'ملاحظات المعلمة', 'الواجب المطلوب قبل الحلقة القادمة']) {
      await expect(page.getByRole('textbox', { name: title, exact: true })).toHaveAttribute('aria-required', 'true');
    }
    await expect(page.getByRole('textbox', { name: 'الدرس النظري / أحكام التجويد', exact: true })).not.toHaveAttribute('aria-required', 'true');
  });
});
