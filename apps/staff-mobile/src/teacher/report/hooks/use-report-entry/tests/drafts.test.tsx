import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError, reportEntryValues } from '@ab/client-core';
import { draftBody } from '@ab/shared';
import { onlineManager } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { backgroundThenActive, captureAppState } from '@/test/app-resume';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { readStoredDraft, REPORT_DRAFTS_KEY } from '@/teacher/report/drafts';
import { reportView } from '@/teacher/report/testing/fixtures';
import { useReportEntry } from '@/teacher/report/hooks/use-report-entry/use-report-entry';

const mockApiSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: jest.fn(),
  apiSend: (m: string, p: string, b?: unknown) => mockApiSend(m, p, b),
}));

const SLOW = { timeout: 3000 };
const puts = () => mockApiSend.mock.calls.filter(([m]) => m === 'PUT');
const offline = () => Promise.reject(new TypeError('Network request failed'));
const serverBody = (report = reportView()) =>
  JSON.stringify(draftBody(reportEntryValues(report, 'quran')));
const storedBody = async () => (await readStoredDraft('r-1'))?.body ?? '{}';

const open = (report = reportView()) =>
  renderHook(() => useReportEntry(report, 'quran'), {
    wrapper: queryWrapper(createTestQueryClient()),
  });

beforeEach(async () => {
  mockApiSend.mockReset();
  await AsyncStorage.clear();
});

async function failOnce() {
  mockApiSend.mockImplementationOnce(offline);
  mockApiSend.mockImplementation(async () => reportView({ notes: 'ملاحظة' }));
  const hook = await open();
  await act(() => hook.result.current.set('notes', 'ملاحظة'));
  await waitFor(() => expect(hook.result.current.saveState.kind).toBe('failed'), SLOW);
  return hook;
}

test('a failed save is kept on the phone', async () => {
  await failOnce();
  expect(JSON.parse(await storedBody())).toMatchObject({ notes: 'ملاحظة' });
});

test('a failed save, then a reconnect: exactly one PUT with the same body', async () => {
  await failOnce();
  await act(() => onlineManager.setOnline(false));
  await act(() => onlineManager.setOnline(true));
  await waitFor(() => expect(puts()).toHaveLength(2), SLOW);
  expect(puts()[1]).toEqual(puts()[0]);
  await waitFor(async () => expect(await readStoredDraft('r-1')).toBeNull());
  await new Promise((done) => setTimeout(done, 1000));
  expect(puts()).toHaveLength(2);
});

test('a failed save, then the app comes back to the front: one retry', async () => {
  captureAppState();
  await failOnce();
  await backgroundThenActive();
  await waitFor(() => expect(puts()).toHaveLength(2), SLOW);
  expect(puts()[1]).toEqual(puts()[0]);
});

test('after an app restart the typed values are shown, then saved', async () => {
  const kept = { notes: 'محفوظ', recited: 'الملك 1-5', attendance: 'on_time' };
  await AsyncStorage.setItem(REPORT_DRAFTS_KEY, JSON.stringify({ 'r-1': { body: JSON.stringify(kept), base: serverBody() } }));
  mockApiSend.mockImplementation(async () => reportView({ notes: 'محفوظ' }));
  const { result } = await open();
  await waitFor(() => expect(result.current.values.notes).toBe('محفوظ'));
  expect(result.current.values.recited).toBe('الملك 1-5');
  expect(result.current.values.attendance).toBe('on_time');
  await waitFor(() => expect(puts()).toHaveLength(1), SLOW);
});

test('a sent report ignores a stored draft', async () => {
  await AsyncStorage.setItem(REPORT_DRAFTS_KEY, JSON.stringify({ 'r-1': { body: '{"notes":"قديم"}', base: serverBody() } }));
  const { result } = await open(reportView({ status: 'submitted', version: 1, notes: 'المرسل' }));
  await act(() => new Promise((done) => setTimeout(done, 50)));
  expect(result.current.values.notes).toBe('المرسل');
});

test('a successful send clears the stored draft', async () => {
  mockApiSend.mockImplementationOnce(offline);
  mockApiSend.mockImplementation(async () =>
    reportView({ status: 'submitted', version: 1, attendance: 'absent' }),
  );
  const { result } = await open();
  await act(() => result.current.set('attendance', 'absent'));
  await waitFor(async () => expect(await readStoredDraft('r-1')).not.toBeNull(), SLOW);
  await act(() => result.current.send());
  await waitFor(() => expect(result.current.report.status).toBe('submitted'));
  await waitFor(async () => expect(await readStoredDraft('r-1')).toBeNull());
});

test('a copy typed before the draft changed elsewhere never overwrites it', async () => {
  const kept = { body: JSON.stringify({ notes: 'قديم' }), base: serverBody() };
  await AsyncStorage.setItem(REPORT_DRAFTS_KEY, JSON.stringify({ 'r-1': kept }));
  const { result } = await open(reportView({ notes: 'من الويب' }));
  await act(() => new Promise((done) => setTimeout(done, 50)));
  expect(result.current.values.notes).toBe('من الويب');
  expect(await readStoredDraft('r-1')).toBeNull();
  await new Promise((done) => setTimeout(done, 1000));
  expect(puts()).toHaveLength(0);
});

test('a save the server refuses is not kept for a retry', async () => {
  mockApiSend.mockImplementation(() => Promise.reject(new ApiError(422)));
  const { result } = await open();
  await act(() => result.current.set('notes', 'ملاحظة'));
  await waitFor(() => expect(result.current.saveState.kind).toBe('failed'), SLOW);
  await waitFor(async () => expect(await readStoredDraft('r-1')).toBeNull());
});
