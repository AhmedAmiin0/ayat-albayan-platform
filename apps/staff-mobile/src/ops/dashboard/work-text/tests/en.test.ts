import { t, isolate } from '@ab/mobile-kit';
import { work } from '@/ops/shared/fixtures';
import { taskText } from '@/ops/dashboard/work-text/work-text';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

test('English: an Arabic student name is isolated inside the English sentence', () => {
  const task = work.tasks.items[0];
  if (!task) throw new Error('fixture');
  expect(t.dashboard.task[task.kind]).toMatch(/[A-Za-z]/);
  expect(taskText(task)).toContain(isolate('سارة أحمد'));
  expect(taskText({ ...task, student: null })).not.toContain('⁨');
});
