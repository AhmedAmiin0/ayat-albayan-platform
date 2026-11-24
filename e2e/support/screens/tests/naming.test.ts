import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isOpener, shotFile } from '../naming.ts';

test('shotFile names a page shot by app, role, route and variant', () => {
  const file = shotFile({
    app: 'staff',
    role: 'admin',
    route: '/admin/students/s1',
    variant: '1440-light',
  });
  assert.equal(file, 'staff/admin/admin-students-s1--1440-light.png');
});

test('shotFile names the root route home and numbers a dialog', () => {
  const file = shotFile({
    app: 'family',
    role: 'public',
    route: '/',
    variant: '390-en',
    dialog: 2,
  });
  assert.equal(file, 'family/public/home--390-en--dialog-2.png');
});

test('isOpener accepts create and edit buttons', () => {
  for (const label of ['إضافة طالب', 'طالب جديد', 'تعديل', 'إنشاء رابط', 'Add student', 'Edit']) {
    assert.equal(isOpener(label), true, label);
  }
});

test('isOpener refuses destructive or sending buttons even beside a create word', () => {
  for (const label of ['حذف', 'إلغاء الحلقة', 'إرسال', 'تسجيل الخروج', 'حذف وإضافة', '']) {
    assert.equal(isOpener(label), false, label);
  }
});
