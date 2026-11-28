import { palette } from '@ab/catalog';
import { SECTIONS_CSS } from './template.css-sections';
import { TABLE_CSS } from './template.css-table';

// Always light, like the report PDF: the PDF is printed, never themed (docs/07 §13).
const c = palette.light;

const vars = [
  `--ink:${c.ink}`,
  `--ink3:${c.ink3}`,
  `--deep:${c.brandTile}`,
  `--green:${c.lapisHover}`,
  `--green2:${c.lapis}`,
  `--gold:${c.gold}`,
  `--gold-soft:${c.goldSoft}`,
  `--cream:${c.actSoft}`,
  `--brown:${c.act}`,
  `--mint:${c.lapisWash}`,
  `--mint2:${c.leatherDeep}`,
  `--rule:${c.rule}`,
  `--paper:${c.page}`,
  `--bad:${c.bad}`,
];

const base = `:root{${vars.join(';')}}
@page{size:A4 portrait;margin:0}
*{box-sizing:border-box}
html,body{margin:0;background:var(--paper)}
body{color:var(--ink);font:400 12px/1.5 'IBM Plex Sans Arabic','Amiri',sans-serif;
-webkit-print-color-adjust:exact;print-color-adjust:exact}
h1,h2,h3,p,ul{margin:0}
small{display:block;font-size:10px;color:var(--ink3)}
.ltr{direction:ltr;unicode-bidi:isolate;white-space:nowrap;font-variant-numeric:tabular-nums}
.sheet{height:297mm;display:flex;flex-direction:column;gap:10px;overflow:hidden}
.sheet>:not(.bar):not(.head):not(.foot){margin-inline:10mm}
.bar{display:block;height:5px;background:var(--gold);flex:none}
.bar+.head{margin-top:-10px}`;

const head = `.head{display:flex;gap:14px;align-items:center;padding:18px 10mm;color:var(--paper);
background:linear-gradient(135deg,var(--deep),var(--green) 60%,var(--green2))}
.logo{flex:none;width:104px;height:104px;display:grid;place-items:center;border-radius:16px;
background:var(--cream);border:2px solid var(--gold-soft)}
.logo img{width:86px;height:auto}
.kicker{font-size:11.5px;font-weight:700;color:var(--gold-soft)}
.title{font:700 28px/1.4 'Amiri',serif}
.title em{font-style:normal;color:var(--gold-soft)}
.pills{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0}
.pill{display:inline-block;padding:3px 12px;border-radius:999px;font-weight:700;
background:color-mix(in srgb,var(--paper) 14%,transparent);
border:1px solid color-mix(in srgb,var(--paper) 30%,transparent)}
.pill.gold,.pill.wa{background:var(--gold-soft);border-color:var(--gold);color:var(--deep)}
.flag{font-family:'Noto Color Emoji',sans-serif}
.intro{font-size:11.5px;opacity:.92}`;

export const PRICE_LIST_CSS = [base, head, TABLE_CSS, SECTIONS_CSS].join('\n');
