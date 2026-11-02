import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { t } from '@/lib/i18n/i18n';
import { CourseActions } from './CourseActions';

const perms = vi.hoisted(() => ({ list: [] as string[] }));
vi.mock('@/features/people/auth', async (orig) => ({
  ...(await orig<object>()),
  usePermissions: () => ({ permissions: perms.list, can: (p: string) => perms.list.includes(p) }),
}));

const words = t.courseActions;
const names = () => screen.queryAllByRole('button').map((b) => b.textContent);

function show(list: string[]) {
  perms.list = list;
  renderWithClient(
    <CourseActions studentId="s1" subscriptionId="sub" mode="sales" onDone={vi.fn()} />,
  );
}

describe('CourseActions: each action behind its own key', () => {
  beforeEach(() => {
    perms.list = [];
  });

  it('all three for admin and sales holders', () => {
    show(['subscriptions.stop', 'students.change_teacher', 'courses.reschedule']);
    expect(names()).toEqual([words.teacher.action, words.times.action, words.stop.action]);
  });

  it('only the keys held (a sales role with the stop revoked)', () => {
    show(['courses.reschedule']);
    expect(names()).toEqual([words.times.action]);
  });

  it('nothing for a teacher or a family (no key)', () => {
    show(['lessons.status']);
    expect(names()).toEqual([]);
  });
});
