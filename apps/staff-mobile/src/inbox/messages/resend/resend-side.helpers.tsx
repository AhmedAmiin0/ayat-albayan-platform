// Tests only: the resend sheet's text side (ContentText's textAlign) and the text it shows.
import { screen } from '@testing-library/react-native';
import { renderWithQuery } from '@/test/query';
import { styleProp } from '@/test/style';
import { ResendSheet } from './ResendSheet';

export async function resendText(): Promise<{ align: unknown; text: unknown }> {
  await renderWithQuery(<ResendSheet phone="+966500000001" id="r1" onClose={jest.fn()} />);
  const node = screen.getByTestId('resend-text');
  return { align: styleProp(node, 'textAlign'), text: node.props.children };
}
