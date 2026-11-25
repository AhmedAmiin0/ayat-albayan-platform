const WHOLE_NUMBER = /^(?:0|[1-9]\d{0,18})$/;

const isSingleCountRow = (rows) =>
  Array.isArray(rows) && rows.length === 1 && Object.keys(rows[0]).join() === 'count';

export const countOf = (rows) => (isSingleCountRow(rows) ? String(rows[0].count) : null);

export const countLines = (items, values) =>
  values.every((value) => WHOLE_NUMBER.test(value ?? ''))
    ? items.map((item, index) => `${item.name}: ${values[index]}`)
    : null;
