import { describe, expect, it } from 'vitest';
import { codeOf, digitsOf, emptyCode, keyStep, typeInto } from './code-boxes';

const boxes = (s: string) => s.split('').map((c) => (c === '_' ? '' : c));

describe('digitsOf', () => {
  it('folds Arabic-Indic and Persian digits and drops the rest', () => {
    expect(digitsOf('١٢٣ ٤٥٦')).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(digitsOf('۷۸-9a')).toEqual(['7', '8', '9']);
    expect(digitsOf('abc')).toEqual([]);
  });
});

describe('codeOf', () => {
  it('is the code only once all six boxes hold a digit', () => {
    expect(codeOf(boxes('123456'))).toBe('123456');
    expect(codeOf(boxes('12_456'))).toBeNull();
    expect(codeOf(emptyCode())).toBeNull();
  });
});

describe('typeInto', () => {
  it('a digit fills the box and moves on', () => {
    expect(typeInto(emptyCode(), 0, '4')).toEqual({ boxes: boxes('4_____'), focus: 1 });
  });

  it('a digit typed over a filled box replaces it', () => {
    expect(typeInto(boxes('4_____'), 0, '47')).toEqual({ boxes: boxes('7_____'), focus: 1 });
  });

  it('a whole code fills every box wherever it lands', () => {
    expect(typeInto(emptyCode(), 3, '123456')).toEqual({ boxes: boxes('123456'), focus: 5 });
    expect(typeInto(emptyCode(), 2, '١٢٣٤٥٦٧')).toEqual({ boxes: boxes('123456'), focus: 5 });
  });

  it('a few digits spill into the next boxes, never past the last', () => {
    expect(typeInto(emptyCode(), 4, '789')).toEqual({ boxes: boxes('____78'), focus: 5 });
  });

  it('an empty or non-digit text clears the box', () => {
    expect(typeInto(boxes('123___'), 1, '')).toEqual({ boxes: boxes('1_3___'), focus: 1 });
    expect(typeInto(boxes('123___'), 1, 'x')).toEqual({ boxes: boxes('1_3___'), focus: 1 });
  });
});

describe('keyStep', () => {
  it('arrows, Home and End move within the boxes', () => {
    const b = boxes('123___');
    expect(keyStep('ArrowLeft', 2, b)?.focus).toBe(1);
    expect(keyStep('ArrowRight', 2, b)?.focus).toBe(3);
    expect(keyStep('ArrowLeft', 0, b)?.focus).toBe(0);
    expect(keyStep('ArrowRight', 5, b)?.focus).toBe(5);
    expect(keyStep('Home', 4, b)?.focus).toBe(0);
    expect(keyStep('End', 1, b)?.focus).toBe(5);
  });

  it('Backspace on an empty box clears the one before and moves there', () => {
    expect(keyStep('Backspace', 3, boxes('123___'))).toEqual({ boxes: boxes('12____'), focus: 2 });
  });

  it('Backspace on a filled box or the first one is the browser default', () => {
    expect(keyStep('Backspace', 2, boxes('123___'))).toBeNull();
    expect(keyStep('Backspace', 0, emptyCode())).toBeNull();
    expect(keyStep('a', 1, emptyCode())).toBeNull();
  });
});
