import { palette } from '@ab/shared';

// The v2 family report's stylesheet (docs/design/report-form/ParentReport.dc.html): the light
// tokens, A4 portrait, one calm column, 1em = 14px and nothing below 12px (docs/07 principle 5).
const c = palette.light;

const tokens = `:root{--ink:${c.ink};--ink2:${c.ink2};--ink3:${c.ink3};--rule:${c.rule};--sunk:${c.sunk};
--page:${c.page};--lapis:${c.lapis};--lapis-wash:${c.lapisWash};--gold:${c.gold};--gold-wash:${c.goldWash};
--ok:${c.ok};--ok-soft:${c.okSoft};--bad:${c.bad};--bad-soft:${c.badSoft};--neutral-soft:${c.neutralSoft}}`;

const base = `@page{size:A4 portrait;margin:14mm}
*{box-sizing:border-box}
body{margin:0;color:var(--ink);background:var(--page);font:400 14px/1.6 'IBM Plex Sans Arabic','Amiri',sans-serif;
-webkit-print-color-adjust:exact;print-color-adjust:exact}
.ltr{direction:ltr;unicode-bidi:isolate;white-space:nowrap;font-variant-numeric:tabular-nums}
.sheet{max-width:150mm;margin:0 auto;display:flex;flex-direction:column;gap:16px}
h1,h2,p{margin:0}
h2{font-size:16px;line-height:1.6;font-weight:700}
.muted{font-size:13px;line-height:1.6;color:var(--ink2)}`;

const head = `.head{display:flex;flex-direction:column;gap:6px;padding-bottom:14px;border-bottom:2px solid var(--gold)}
.brand{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--lapis)}
.brand img{height:28px;width:auto}
.head h1{font-size:22px;line-height:1.4;font-weight:700}
.chip{align-self:flex-start;padding:3px 10px;border-radius:999px;font-size:13px;font-weight:600}
.tone-ok{background:var(--ok-soft);color:var(--ok)}.tone-bad{background:var(--bad-soft);color:var(--bad)}
.tone-neutral{background:var(--neutral-soft);color:var(--ink2)}`;

const body = `section{display:flex;flex-direction:column;gap:8px;break-inside:avoid}
.row{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;background:var(--sunk)}
.what{flex:1;display:flex;flex-direction:column;gap:2px}
.what .k{font-size:13px;font-weight:600;color:var(--ink3)}.what .v{font-size:15px;font-weight:600}
.pill{padding:3px 10px;border-radius:999px;background:var(--lapis-wash);color:var(--lapis);font-size:13px;font-weight:700}
.overall{flex-direction:row;align-items:center;justify-content:space-between;padding:14px;border-radius:12px;border:1px solid var(--rule)}
.overall .k{font-size:15px;font-weight:700}.overall .w{font-size:20px;font-weight:700;color:var(--lapis)}
.bar-head{display:flex;justify-content:space-between;font-size:13px;color:var(--ink2)}
.bar{height:10px;border-radius:999px;background:var(--sunk);overflow:hidden}
.bar i{display:block;height:100%;background:var(--lapis);border-radius:999px}
.text{font-size:15px;line-height:1.8}
.note{padding:12px 14px;border-radius:12px;background:var(--gold-wash)}
.foot{margin-top:8px;padding-top:12px;border-top:1px solid var(--rule);font-size:12px;line-height:1.6;color:var(--ink3);
display:flex;flex-direction:column;gap:2px}`;

export const FAMILY_CSS = [tokens, base, head, body].join('\n');
