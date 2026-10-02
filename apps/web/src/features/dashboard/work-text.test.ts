import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { packageText, taskText } from './work-text';

const SUHAILA = { id: 's1', code: 'AB-0183', name: 'سهيلة' };

describe('taskText', () => {
  it('renewal: the student and what is left of the package', () => {
    expect(taskText({ kind: 'renewal_due', student: SUHAILA, balance: { used: 2, total: 4 } })).toBe(
      t.dashboard.task.renewal_due.replace('{student}', 'سهيلة').replace('{left}', t.subscriptions.progress.left.two),
    );
  });

  it('unpaid: the student only; a task without a package has no left part', () => {
    expect(taskText({ kind: 'subscription_unpaid', student: SUHAILA, balance: null })).toBe(
      t.dashboard.task.subscription_unpaid.replace('{student}', 'سهيلة'),
    );
  });
});

describe('packageText', () => {
  it('a catalog package by its word, a custom one by its lesson count', () => {
    expect(packageText({ package: '8', lessons_total: 8 })).toBe(t.enums.packageSize[8]);
    expect(packageText({ package: null, lessons_total: 6 })).toBe(t.pricing.customSessions.few.replace('{n}', '6'));
  });
});
