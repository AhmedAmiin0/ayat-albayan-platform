import { palette } from '@ab/catalog';

// The report PDF's brand: always light, A4, the same palette and faces (docs/07 §13).
const c = palette.light;

const vars = [
  `--ink:${c.ink}`,
  `--ink3:${c.ink3}`,
  `--green:${c.lapisHover}`,
  `--green2:${c.lapis}`,
  `--gold:${c.gold}`,
  `--gold-soft:${c.goldSoft}`,
  `--gold-wash:${c.goldWash}`,
  `--rule:${c.rule}`,
  `--tint:${c.sunk}`,
  `--paper:${c.page}`,
  `--raised:${c.raised}`,
  `--bad:${c.bad}`,
];

const base = `:root{${vars.join(';')}}
@page{size:A4 portrait;margin:10mm}
*{box-sizing:border-box}
body{margin:0;color:var(--ink);font:400 14px/1.6 'IBM Plex Sans Arabic','Amiri',sans-serif;
-webkit-print-color-adjust:exact;print-color-adjust:exact}
.ltr{direction:ltr;unicode-bidi:isolate;white-space:nowrap;font-variant-numeric:tabular-nums}
.frame{border:2px solid var(--gold);padding:4px;background:var(--raised)}
.inner{border:1px solid var(--gold-soft);padding:12px 16px}`;

const head = `.head{text-align:center}
.logo img{height:56px;width:auto}
.academy{margin:0;font:700 26px/1.35 'Amiri',serif;color:var(--green)}
.tagline{margin:0;font-size:13px;color:var(--ink3)}
.cartouche{display:inline-block;margin:6px 0 10px;padding:1px 24px;
border:1px solid var(--gold-soft);
border-radius:6px;background:var(--tint);font:700 22px/1.4 'Amiri',serif;color:var(--green)}
.meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:4px}
.cell{border:1px solid var(--rule);border-top:2px solid var(--gold-soft);text-align:center}
.cell .k{font-size:12px;color:var(--ink3)}
.cell .v{font-size:15px;font-weight:700;color:var(--green2)}
.offer{margin:8px 0 0;padding:4px;border:1px solid var(--gold-soft);border-radius:6px;
background:var(--gold-wash);text-align:center;font-weight:700;color:var(--green)}`;

const table = `.sec{margin:10px 0 4px;border-bottom:1px solid var(--gold);
font:700 19px/1.35 'Amiri',serif;color:var(--green);break-after:avoid}
.prices{width:100%;border-collapse:collapse;break-inside:avoid}
.prices th{font-size:12px;font-weight:600;color:var(--ink3);text-align:start;
border-bottom:1px solid var(--rule);padding:2px 8px}
.prices td{padding:3px 8px;border-bottom:1px dotted var(--rule)}
.prices .now{font-weight:700;color:var(--green2)}
.was{color:var(--bad);text-decoration-thickness:1.5px}
.note{margin-top:12px;text-align:center;font-size:13px;color:var(--green2)}`;

export const PRICE_LIST_CSS = [base, head, table].join('\n');
