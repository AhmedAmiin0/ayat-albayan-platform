import { render, screen } from '@testing-library/react-native';
import { StepMark } from './StepMark';
import { CHECK, CLOCK } from './step-mark.helpers';

const pathOf = (json: string) => /"d":"([^"]+)"/.exec(json)?.[1];

test('a step to come shows its number', async () => {
  await render(<StepMark state="pending" n={3} />);
  expect(screen.getByText('3')).toBeTruthy();
});

test.each([
  ['done', CHECK],
  ['current', CLOCK],
] as const)('a %s step draws its glyph, not its number', async (state, d) => {
  const view = await render(<StepMark state={state} n={2} />);
  expect(pathOf(JSON.stringify(view.toJSON()))).toBe(d);
  expect(screen.queryByText('2')).toBeNull();
});
