import { DEFAULT_HOME_PREFS, HOME_PREFS_KEY } from '@ab/client-core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { HomeCustomizeScreen } from './HomeCustomizeScreen';
import { resetHomePrefs } from './home-prefs';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

afterEach(async () => {
  resetHomePrefs();
  await AsyncStorage.clear();
});

const saved = async () => JSON.parse((await AsyncStorage.getItem(HOME_PREFS_KEY)) ?? '{}') as unknown;

test('every switch starts on except compact rows', async () => {
  await renderWithQuery(<HomeCustomizeScreen />);
  expect(screen.getByLabelText(t.teacherAlerts.kind.bell).props.value).toBe(true);
  expect(screen.getByLabelText(t.teacherAlerts.hero).props.value).toBe(true);
  expect(screen.getByLabelText(t.teacherAlerts.compact).props.value).toBe(false);
  expect(screen.getByText(t.teacherAlerts.savedHere)).toBeTruthy();
});

test('a switch applies at once and is saved on this device', async () => {
  await renderWithQuery(<HomeCustomizeScreen />);
  await act(async () => {
    await fireEvent(screen.getByLabelText(t.teacherAlerts.kind.soon), 'valueChange', false);
  });
  await act(async () => {
    await fireEvent(screen.getByLabelText(t.teacherAlerts.compact), 'valueChange', true);
  });
  expect(screen.getByLabelText(t.teacherAlerts.kind.soon).props.value).toBe(false);
  expect(await saved()).toEqual({
    ...DEFAULT_HOME_PREFS,
    alerts: { ...DEFAULT_HOME_PREFS.alerts, soon: false },
    density: 'compact',
  });
});
