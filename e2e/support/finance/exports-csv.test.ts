import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BOM, parseCsv } from './exports-csv';

test('parseCsv splits quoted CRLF rows into cells and drops the BOM', () => {
  const text = `${BOM}"a","b"\r\n"1","2"\r\n`;
  assert.deepEqual(parseCsv(text), [
    ['a', 'b'],
    ['1', '2'],
  ]);
});

test('parseCsv keeps doubled quotes, commas and line breaks inside a quoted cell', () => {
  assert.deepEqual(parseCsv('"say ""hi""","x,y","l1\r\nl2"'), [['say "hi"', 'x,y', 'l1\r\nl2']]);
});

test('parseCsv reads unquoted cells and a last row without a line break', () => {
  assert.deepEqual(parseCsv('a,b\nc,'), [
    ['a', 'b'],
    ['c', ''],
  ]);
});

test('parseCsv keeps empty cells and returns no row for empty text', () => {
  assert.deepEqual(parseCsv(',,\n'), [['', '', '']]);
  assert.deepEqual(parseCsv(''), []);
  assert.deepEqual(parseCsv(BOM), []);
});

test('parseCsv drops a bare carriage return outside quotes', () => {
  assert.deepEqual(parseCsv('a\rb,c'), [['ab', 'c']]);
});
