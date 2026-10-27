import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import appJson from '../../app.json';
import PaymentRoute from '../../app/(tabs)/students/payment/[id]';
import { PaymentScreen } from './screens/PaymentScreen';

const stub = (label: string) => () => <Text>{label}</Text>;

test('the route file serves the payment screen', () => {
  expect(PaymentRoute).toBe(PaymentScreen);
});

test('/students/payment/:id opens the payment screen, beside the student quick view', async () => {
  const pending = renderRouter(
    { 'students/[id]': stub('student-screen'), 'students/payment/[id]': stub('payment-screen') },
    { initialUrl: '/students/payment/s1' },
  );
  await pending;
  expect(screen.getByText('payment-screen')).toBeTruthy();
  expect(pending.getPathname()).toBe('/students/payment/s1');
});

test('the OS permission texts in app.json are the ar.json rationales (the microphone: the calls, docs/28)', () => {
  const plugin = appJson.expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-image-picker');
  expect(Array.isArray(plugin) ? plugin[1] : undefined).toEqual({
    cameraPermission: t.payments.mobile.cameraRationale,
    photosPermission: t.payments.mobile.photosRationale,
    microphonePermission: t.calls.mic.rationale,
  });
});
