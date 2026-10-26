import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Vibration } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { CallButton } from '../entries/CallButton';
import { CallProvider } from './CallProvider';
import { fakeRtc, OFF, ON, ringing, routes } from './call-test-kit';

const mockFetch = jest.fn();
const mockSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (...a: unknown[]) => mockFetch(...a),
  apiSend: (...a: unknown[]) => mockSend(...a),
}));
jest.mock('../rtc/audio-route', () => ({ routeCallAudio: jest.fn(async () => undefined), restorePlayback: jest.fn(async () => undefined) }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const ui = () => (
  <SafeAreaProvider initialMetrics={metrics}>
    <CallProvider rtc={fakeRtc().deps}>
      <CallButton phone="+966501234567" name="أم سهيلة" canSend />
    </CallProvider>
  </SafeAreaProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Vibration, 'vibrate').mockImplementation(() => undefined);
  jest.spyOn(Vibration, 'cancel').mockImplementation(() => undefined);
  mockSend.mockImplementation(async (_m: string, path: string) => ({ ...ringing(), id: path === '/calls' ? 'out1' : 'in1', status: 'connecting' }));
});

test('off: only /calls/config is asked, no phone icon, no ring', async () => {
  mockFetch.mockImplementation(routes({ config: OFF, active: [ringing()] }));
  await renderWithQuery(ui());
  await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('/calls/config'));
  expect(mockFetch.mock.calls.map((c) => c[0])).toEqual(['/calls/config']);
  expect(screen.queryByTestId('call-button')).toBeNull();
  expect(Vibration.vibrate).not.toHaveBeenCalled();
});

test('an incoming call rings full screen; «قبول» posts our answer to the family\'s offer', async () => {
  mockFetch.mockImplementation(routes({ config: ON, active: [ringing()] }));
  await renderWithQuery(ui());
  expect(await screen.findByTestId('incoming-call')).toBeTruthy();
  expect(Vibration.vibrate).toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText(t.calls.controls.accept));
  await waitFor(() => expect(mockSend).toHaveBeenCalledWith('POST', '/calls/in1/accept', { sdp: 'v=0 our answer' }));
});

test('«رفض» rejects on WhatsApp and stops the ring at once', async () => {
  mockFetch.mockImplementation(routes({ config: ON, active: [ringing()] }));
  await renderWithQuery(ui());
  await fireEvent.press(await screen.findByLabelText(t.calls.controls.decline));
  await waitFor(() => expect(mockSend).toHaveBeenCalledWith('POST', '/calls/in1/reject'));
  await waitFor(() => expect(screen.queryByTestId('incoming-call')).toBeNull());
  expect(Vibration.cancel).toHaveBeenCalled();
});

test('the phone icon: with permission, our gathered offer goes to POST /calls once', async () => {
  mockFetch.mockImplementation(routes({ config: ON }));
  await renderWithQuery(ui());
  await fireEvent.press(await screen.findByTestId('call-button'));
  await waitFor(() => expect(mockSend.mock.calls.filter((c) => c[1] === '/calls')).toHaveLength(1));
  expect(mockSend).toHaveBeenCalledWith('POST', '/calls', expect.objectContaining({ phone: '+966501234567', sdp: 'v=0 our offer' }));
  expect(await screen.findByTestId('call-screen')).toBeTruthy();
});

test('no permission inside the window: «اطلب إذن الاتصال» sends the request through the API', async () => {
  mockFetch.mockImplementation(routes({ config: ON, permission: 'request' }));
  await renderWithQuery(ui());
  await fireEvent.press(await screen.findByTestId('call-button'));
  await fireEvent.press(await screen.findByText(t.calls.permission.request));
  await waitFor(() => expect(mockSend).toHaveBeenCalledWith('POST', '/calls/permission/%2B966501234567/request', expect.objectContaining({ clientRequestId: expect.any(String) })));
  expect(await screen.findByText(t.calls.permission.requestSent)).toBeTruthy();
  expect(mockSend.mock.calls.some((c) => c[1] === '/calls')).toBe(false);
});

test('outside the window it only explains: a template is needed', async () => {
  mockFetch.mockImplementation(routes({ config: ON, permission: 'needs_template' }));
  await renderWithQuery(ui());
  await fireEvent.press(await screen.findByTestId('call-button'));
  expect(await screen.findByText(t.calls.permission.needsTemplate)).toBeTruthy();
  expect(screen.queryByText(t.calls.permission.request)).toBeNull();
});
