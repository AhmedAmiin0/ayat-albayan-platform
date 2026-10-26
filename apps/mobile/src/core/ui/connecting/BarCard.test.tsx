import { render, screen } from '@testing-library/react-native';
import { useColorScheme } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { palette } from '@/theme';
import { BarCard, barLook } from './BarCard';

// The card's shape and its tokens per phase, in light and dark (never a hex in the component).
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({ __esModule: true, default: jest.fn(() => 'light') }));
const scheme = jest.mocked(useColorScheme);
const c = t.mobile.connection;
const card = () => screen.getByTestId('connecting-bar');

test.each(['light', 'dark'] as const)('%s: neutral + gold dots, amber + act dots, ok wash', (name) => {
  const color = palette[name];
  expect(barLook('connecting', color)).toEqual({ bg: color.neutralSoft, ink: color.ink2, dots: color.gold });
  expect(barLook('check', color)).toEqual({ bg: color.actSoft, ink: color.ink2, dots: color.act });
  expect(barLook('connected', color)).toEqual({ bg: color.okSoft, ink: color.coverInk, dots: color.ok });
});

test('connecting: 12 pt radius, 9 / 14 padding, a centred row, 14 / 22 semibold ink-2', async () => {
  await render(<BarCard phase="connecting" still={false} />);
  expect(card()).toHaveStyle({
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: palette.light.neutralSoft,
  });
  expect(screen.getByText(c.connecting)).toHaveStyle({ fontSize: 14, lineHeight: 22, color: palette.light.ink2 });
  expect(screen.getAllByTestId('connecting-dot', { includeHiddenElements: true })[0]).toHaveStyle({ backgroundColor: palette.light.gold });
});

test('dark, after 10 s: the amber wash, act dots, a second 13 / 21 line in act, rows from the top', async () => {
  scheme.mockReturnValue('dark');
  await render(<BarCard phase="check" still={false} />);
  expect(card()).toHaveStyle({ alignItems: 'flex-start', backgroundColor: palette.dark.actSoft });
  expect(card()).toHaveProp('accessibilityLabel', `${c.connecting} ${c.checkInternet}`);
  expect(screen.getByText(c.checkInternet)).toHaveStyle({ fontSize: 13, lineHeight: 21, color: palette.dark.act });
  expect(screen.getAllByTestId('connecting-dot', { includeHiddenElements: true })[0]).toHaveStyle({ backgroundColor: palette.dark.act });
  scheme.mockReturnValue('light');
});

test('«تم الاتصال»: the ok wash, the check badge, 14 / 22 semibold cover ink', async () => {
  await render(<BarCard phase="connected" still={false} />);
  expect(card()).toHaveStyle({ backgroundColor: palette.light.okSoft });
  expect(screen.getByTestId('check-badge', { includeHiddenElements: true })).toBeOnTheScreen();
  expect(screen.queryByTestId('connecting-dot', { includeHiddenElements: true })).toBeNull();
  expect(screen.getByText(c.connected)).toHaveStyle({ fontSize: 14, lineHeight: 22, color: palette.light.coverInk });
  expect(card()).toHaveProp('accessibilityLiveRegion', 'polite');
});
