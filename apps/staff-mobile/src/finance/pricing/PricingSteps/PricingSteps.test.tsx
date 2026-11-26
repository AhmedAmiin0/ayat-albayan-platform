import { fireEvent, render, screen } from '@testing-library/react-native';
import { t, AppText } from '@ab/mobile-kit';
import { DEFAULT_SELECTION } from '@/finance/pricing/selection';
import { PricingSteps } from './PricingSteps';

const p = t.pricing;
const step = (title: string) => screen.queryByRole('header', { name: title });
const radio = (name: string) => screen.queryByRole('radio', { name });

test('the calculator shows every step, with the free discount field beside the pills', async () => {
  await render(<PricingSteps selection={DEFAULT_SELECTION} onChange={jest.fn()} />);
  for (const title of Object.values(p.steps)) expect(step(title)).toBeTruthy();
  expect(radio(p.durations['45'])?.props.accessibilityState).toEqual({ checked: true });
  expect(radio(p.frequencies.standard)?.props.accessibilityState).toEqual({ checked: true });
  expect(screen.getAllByLabelText(p.steps.discount)).toHaveLength(2);
});

test('a price list has every duration and package: without the plan steps both are gone', async () => {
  const steps = (
    <PricingSteps selection={DEFAULT_SELECTION} onChange={jest.fn()} planSteps={false} />
  );
  await render(steps);
  expect(step(p.steps.duration)).toBeNull();
  expect(step(p.steps.frequency)).toBeNull();
  expect(radio(p.durations['45'])).toBeNull();
  expect(radio(p.frequencies.standard)).toBeNull();
  expect(radio(p.customLabel)).toBeNull();
  for (const title of [p.steps.country, p.steps.students, p.steps.discount]) {
    expect(step(title)).toBeTruthy();
  }
  expect(radio(p.countries.SA)?.props.accessibilityState).toEqual({ checked: true });
  expect(screen.getAllByLabelText(p.steps.discount)).toHaveLength(2);
});

test('the weekly package has one duration: a note stands in for the duration pills', async () => {
  const weekly = { ...DEFAULT_SELECTION, plan: 'weekly' } as const;
  await render(<PricingSteps selection={weekly} onChange={jest.fn()} />);
  expect(screen.getByText(p.fixedDuration)).toBeTruthy();
  expect(radio(p.durations['45'])).toBeNull();
});

test('each step hands back only what it changed', async () => {
  const onChange = jest.fn();
  await render(<PricingSteps selection={DEFAULT_SELECTION} onChange={onChange} />);
  await fireEvent.press(screen.getByRole('radio', { name: p.countries.AE }));
  await fireEvent.press(screen.getByRole('radio', { name: p.durations['60'] }));
  await fireEvent.press(screen.getByRole('radio', { name: p.frequencies.bulk }));
  await fireEvent.press(screen.getByRole('button', { name: p.increase }));
  await fireEvent.press(screen.getByRole('radio', { name: p.discounts['15'] }));
  await fireEvent.changeText(screen.getByDisplayValue('0'), '12.5');
  expect(onChange.mock.calls).toEqual([
    [{ country: 'AE' }],
    [{ duration: '60' }],
    [{ plan: 'bulk' }],
    [{ students: 2 }],
    [{ discount: '15' }],
    [{ discount: '12.5' }],
  ]);
});

test('a custom count steps its own number of lessons', async () => {
  const onChange = jest.fn();
  const custom = { ...DEFAULT_SELECTION, plan: 'custom', count: 10 } as const;
  await render(<PricingSteps selection={custom} onChange={onChange} />);
  const [countMore] = screen.getAllByRole('button', { name: p.increase });
  if (!countMore) throw new Error('no count stepper');
  await fireEvent.press(countMore);
  expect(onChange).toHaveBeenCalledWith({ count: 11 });
});

test('what the caller adds to the discount step sits inside it', async () => {
  const extra = <AppText>extra</AppText>;
  const steps = (
    <PricingSteps selection={DEFAULT_SELECTION} onChange={jest.fn()} discountExtra={extra} />
  );
  await render(steps);
  expect(screen.getByText('extra')).toBeTruthy();
});
