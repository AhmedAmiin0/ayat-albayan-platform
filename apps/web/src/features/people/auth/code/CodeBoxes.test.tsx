import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { CodeBoxes } from './CodeBoxes';
import { emptyCode } from './code-boxes';

function Harness() {
  const [digits, setDigits] = useState(emptyCode);
  return <CodeBoxes digits={digits} onDigits={setDigits} />;
}

const box = (n: number) => screen.getByLabelText(t.familyAuth.codeDigit.replace('{n}', String(n))) as HTMLInputElement;
const values = () => [1, 2, 3, 4, 5, 6].map((n) => box(n).value).join('');
const paste = (n: number, text: string) => fireEvent.paste(box(n), { clipboardData: { getData: () => text } });

describe('CodeBoxes (docs/30 §7)', () => {
  it('six numeric boxes, left to right, the first one offering the code autofill', () => {
    render(<Harness />);
    expect(box(1).getAttribute('autocomplete')).toBe('one-time-code');
    expect(box(2).getAttribute('autocomplete')).toBe('off');
    expect(box(6).getAttribute('inputmode')).toBe('numeric');
    expect(box(1).closest('[role=group]')?.getAttribute('dir')).toBe('ltr');
    expect(screen.getByRole('group', { name: t.familyAuth.code })).toBeTruthy();
  });

  it('typing a digit fills the box and moves to the next one', () => {
    render(<Harness />);
    fireEvent.change(box(1), { target: { value: '7' } });
    expect(box(1).value).toBe('7');
    expect(document.activeElement).toBe(box(2));
    fireEvent.change(box(2), { target: { value: '٣' } });
    expect(values()).toBe('73');
  });

  it('a pasted code fills every box, from any box', () => {
    render(<Harness />);
    paste(4, '123456');
    expect(values()).toBe('123456');
    expect(document.activeElement).toBe(box(6));
  });

  it('a pasted Arabic-Indic code with spaces works too', () => {
    render(<Harness />);
    paste(1, '١٢٣ ٤٥٦');
    expect(values()).toBe('123456');
  });

  it('Backspace on an empty box clears the previous one and moves back', () => {
    render(<Harness />);
    paste(1, '123');
    fireEvent.keyDown(box(4), { key: 'Backspace' });
    expect(values()).toBe('12');
    expect(document.activeElement).toBe(box(3));
  });

  it('arrow keys move between the boxes', () => {
    render(<Harness />);
    box(3).focus();
    fireEvent.keyDown(box(3), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(box(4));
    fireEvent.keyDown(box(4), { key: 'ArrowLeft' });
    fireEvent.keyDown(box(3), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(box(2));
  });
});
