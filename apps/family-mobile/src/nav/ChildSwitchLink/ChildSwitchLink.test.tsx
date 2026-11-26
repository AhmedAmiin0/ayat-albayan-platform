import { fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { student } from '@/portal/portal.fixtures';
import { closeChildSwitch, useChildSwitch } from '@/nav/switch-store';
import { ChildSwitchLink } from './ChildSwitchLink';

afterEach(() => closeChildSwitch());

test("the child's name as one button that opens the children sheet", async () => {
  const kid = student();
  await render(<ChildSwitchLink student={kid} />);
  const link = screen.getByRole('button', {
    name: t.portal.app.pick.open.replace('{name}', kid.name),
  });
  expect(screen.getByText(kid.name)).toBeTruthy();
  await fireEvent.press(link);
  const { result } = await renderHook(() => useChildSwitch());
  expect(result.current.open).toBe(true);
});
