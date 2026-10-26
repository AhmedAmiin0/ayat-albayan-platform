import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus, Vibration } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ON, routes } from './call-test-kit';
import { mountCalls as mount, placed } from './call-test-mount';

const mockFetch = jest.fn();
const mockSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (...a: unknown[]) => mockFetch(...a),
  apiSend: (...a: unknown[]) => mockSend(...a),
}));


beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Vibration, 'vibrate').mockImplementation(() => undefined);
  jest.spyOn(Vibration, 'cancel').mockImplementation(() => undefined);
  mockFetch.mockImplementation(routes({ config: ON }));
  mockSend.mockImplementation(async () => placed);
});

describe('the app and the setting around a live call', () => {
  it('calls switched off mid-call: the call is hung up', async () => {
    mockFetch.mockImplementation(routes({ config: ON, active: [placed] }));
    const { client } = await mount();
    await fireEvent.press(await screen.findByTestId('call-button'));
    await screen.findByTestId('call-screen');
    mockFetch.mockImplementation(routes({ config: { ...ON, enabled: false }, active: [] }));
    await act(async () => void (await client.refetchQueries({ queryKey: ['calls', 'config'] })));
    await waitFor(() => expect(mockSend).toHaveBeenCalledWith('POST', '/calls/out1/end'));
  });

  it('back from the background during a call: a calm notice that the call may have been silent', async () => {
    let change: (s: AppStateStatus) => void = () => undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      change = handler as (s: AppStateStatus) => void;
      return { remove: () => undefined };
    });
    mockFetch.mockImplementation(routes({ config: ON, active: [placed] }));
    await mount();
    await fireEvent.press(await screen.findByTestId('call-button'));
    await screen.findByTestId('call-screen');
    await act(async () => change('background'));
    await act(async () => change('active'));
    expect(await screen.findByText(t.calls.backgrounded)).toBeTruthy();
  });
});
