import { QueryClient } from '@tanstack/react-query';
import { hasSavedData, QUIET_TEXT_AFTER_MS, RETRY_AFTER_MS, startupMode, startupStage, TEXT_AFTER_MS } from './startup-mode';

test('saved data on disk (or still being read) → quiet; nothing saved → loading', () => {
  expect(startupMode({ restoring: true, hasSaved: false })).toBe('quiet');
  expect(startupMode({ restoring: false, hasSaved: true })).toBe('quiet');
  expect(startupMode({ restoring: false, hasSaved: false })).toBe('loading');
});

test('loading: «جارٍ الاتصال» from the first frame, «إعادة المحاولة» from 10 s', () => {
  expect(TEXT_AFTER_MS).toBe(0);
  expect(startupStage('loading', 0)).toBe('connecting');
  expect(startupStage('loading', RETRY_AFTER_MS - 1)).toBe('connecting');
  expect(startupStage('loading', RETRY_AFTER_MS)).toBe('retry');
});

test('quiet: the mark alone for longer, the same retry at 10 s', () => {
  expect(startupStage('quiet', QUIET_TEXT_AFTER_MS - 1)).toBe('mark');
  expect(startupStage('quiet', QUIET_TEXT_AFTER_MS)).toBe('connecting');
  expect(startupStage('quiet', RETRY_AFTER_MS)).toBe('retry');
});

test('saved data = any query restored with data', () => {
  const client = new QueryClient();
  expect(hasSavedData(client)).toBe(false);
  client.setQueryData(['today'], { lessons: [] });
  expect(hasSavedData(client)).toBe(true);
});
