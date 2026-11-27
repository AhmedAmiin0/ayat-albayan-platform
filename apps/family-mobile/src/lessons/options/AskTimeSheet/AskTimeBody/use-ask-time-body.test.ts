import { renderHook } from '@testing-library/react-native';
import { freshQueryClient, queryWrapper } from '@ab/mobile-kit/testing';
import { lesson, student } from '@/portal/portal.fixtures';
import { useAskTimeBody } from './use-ask-time-body';

jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: () => Promise.resolve({ tz: 'Asia/Riyadh', step_min: 45, slots: [] }),
}));

test('sending before a slot is picked sends nothing', async () => {
  const onSend = jest.fn();
  const setup = {
    lesson: lesson(new Date('2026-11-16T10:00:00.000Z'), 60),
    student: student(),
    onSend,
  };
  const { result } = await renderHook(() => useAskTimeBody(setup), {
    wrapper: queryWrapper(freshQueryClient()),
  });
  result.current.send();
  expect(onSend).not.toHaveBeenCalled();
});
