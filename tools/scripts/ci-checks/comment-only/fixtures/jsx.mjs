// JSX base/head pairs. A `{/* … */}` child may go only where React's whitespace rule renders the
// same text: lines trimmed of spaces and tabs at their inner ends, empty lines dropped, joined by
// one space. A space between siblings on one line, and NBSP, are rendered.
const nbsp = ' ';

export const pass = [
  {
    name: 'a JSX comment child removed',
    file: 'A.tsx',
    base: [
      'export const A = () => (',
      '  <div>',
      '    {/* the title */}',
      '    <h1>Hi</h1>',
      '    {/* x */}',
      '  </div>',
      ');',
    ].join('\n'),
    head: 'export const A = () => (\n  <div>\n    <h1>Hi</h1>\n  </div>\n);\n',
  },
  {
    name: 'a JSX comment removed between words',
    file: 'A.tsx',
    base: 'const a = <p>one {/* x */} two</p>;\n',
    head: 'const a = <p>one  two</p>;\n',
  },
  {
    name: 'a comment inside a JSX attribute expression removed',
    file: 'A.tsx',
    base: 'const a = <p title={t /* why */}>x</p>;\n',
    head: 'const a = <p title={t}>x</p>;\n',
  },
  {
    name: 'a multi-line JSX comment child removed',
    file: 'A.tsx',
    base: 'const a = (\n  <p>\n    {/*\n      why\n    */}\n    <b />\n  </p>\n);\n',
    head: 'const a = (\n  <p>\n    <b />\n  </p>\n);\n',
  },
  {
    name: 'the only child, a comment, removed',
    file: 'A.tsx',
    base: 'const a = <div className="spacer">{/* keeps the grid */}</div>;\n',
    head: 'const a = <div className="spacer"></div>;\n',
  },
  {
    name: 'CRLF line breaks turned into LF',
    file: 'A.tsx',
    base: 'const a = (\r\n  <p>\r\n    one\r\n    two\r\n  </p>\r\n);\r\n',
    head: 'const a = (\n  <p>\n    one\n    two\n  </p>\n);\n',
  },
  {
    name: 'text re-indented across lines',
    file: 'A.tsx',
    base: 'const a = (\n  <p>\n    one\n    two\n  </p>\n);\n',
    head: 'const a = (\n  <p>\n\t\tone\n      two\n  </p>\n);\n',
  },
];

export const fail = [
  {
    name: 'a JSX child element removed',
    file: 'A.tsx',
    base: 'const a = (\n  <div>\n    <h1>Hi</h1>\n    <p>x</p>\n  </div>\n);\n',
    head: 'const a = (\n  <div>\n    <h1>Hi</h1>\n  </div>\n);\n',
  },
  {
    name: 'a // inside JSX text changed',
    file: 'A.tsx',
    base: 'const a = <p>see // here</p>;\n',
    head: 'const a = <p>see</p>;\n',
  },
  {
    name: 'a /* inside JSX text changed',
    file: 'A.tsx',
    base: 'const a = <p>a /* b */ c</p>;\n',
    head: 'const a = <p>a c</p>;\n',
  },
  {
    name: 'the space between two siblings on one line removed (Money.tsx)',
    file: 'Money.tsx',
    base: [
      '/** «1,061 ر.س» */',
      'export const M = () => (',
      '  <span>',
      '    <Ltr>{n}</Ltr> {t.pricing.currencies[c]}',
      '  </span>',
      ');',
    ].join('\n'),
    head: 'export const M = () => (\n  <span>\n    <Ltr>{n}</Ltr>{t.pricing.currencies[c]}\n  </span>\n);\n',
  },
  {
    name: 'the trailing space of the first line removed',
    file: 'A.tsx',
    base: 'const a = <p>Hello <b>x</b></p>;\n',
    head: 'const a = <p>Hello<b>x</b></p>;\n',
  },
  {
    name: 'the space between two expressions removed',
    file: 'A.tsx',
    base: 'const a = <>{a} {b}</>;\n',
    head: 'const a = <>{a}{b}</>;\n',
  },
  {
    name: 'an NBSP turned into a space',
    file: 'A.tsx',
    base: `const a = <p>1,061${nbsp}SAR</p>;\n`,
    head: 'const a = <p>1,061 SAR</p>;\n',
  },
  {
    name: 'a comment between two lines of text removed (renders «ab», then «a b»)',
    file: 'A.tsx',
    base: 'const a = (\n  <p>\n    a\n    {/* x */}\n    b\n  </p>\n);\n',
    head: 'const a = (\n  <p>\n    a\n    b\n  </p>\n);\n',
  },
];
