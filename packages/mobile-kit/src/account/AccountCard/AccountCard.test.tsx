import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { t } from '../../lib/i18n/i18n';
import { AccountCard } from './AccountCard';

const button = () => screen.getByRole('button', { name: `${t.account.save} — الاسم` });

test('a header, its content and no save button without onSave', async () => {
  await render(
    <AccountCard title="الاسم">
      <Text>المحتوى</Text>
    </AccountCard>,
  );
  expect(screen.getByRole('header')).toHaveTextContent('الاسم');
  expect(screen.getByText('المحتوى')).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
});

test('the save runs onSave and reads as saving while pending', async () => {
  const onSave = jest.fn();
  const view = await render(
    <AccountCard title="الاسم" onSave={onSave}>
      <Text>المحتوى</Text>
    </AccountCard>,
  );
  await fireEvent.press(button());
  expect(onSave).toHaveBeenCalledTimes(1);
  await view.rerender(
    <AccountCard title="الاسم" onSave={onSave} pending>
      <Text>المحتوى</Text>
    </AccountCard>,
  );
  expect(screen.getByText(t.account.saving)).toBeTruthy();
});

test('off when disabled; the error and then the notice show under it', async () => {
  await render(
    <AccountCard title="الاسم" onSave={jest.fn()} disabled error="خطأ" notice="تم">
      <Text>المحتوى</Text>
    </AccountCard>,
  );
  expect(button()).toBeDisabled();
  expect(screen.getByText('خطأ')).toBeTruthy();
  expect(screen.getByText('تم')).toBeTruthy();
});
