import { palette } from '@ab/shared';

// The report's stylesheet (docs/07 §13): always the light tokens, A4 portrait, 1em = 14px and
// nothing below 12px. The frame, header, summary grid and ۞ sections follow the academy's own
// certificate report (Brand library reportHtml: 2px gold outside a 1px gold-soft rule). Page margin
// is 10mm, not docs/07's 18mm: the frame itself is the margin, and 18mm overflows at a 12px floor.
// ponytail: very long notes flow onto a 2nd page (the frame repeats via box-decoration-break);
// add a fit-to-page step if real reports do that often.
const c = palette.light;

const tokens = `:root{--ink:${c.ink};--ink3:${c.ink3};--green:${c.lapisHover};--green2:${c.lapis};
--gold:${c.gold};--gold-soft:${c.goldSoft};--gold-wash:${c.goldWash};--rule:${c.rule};
--tint:${c.sunk};--paper:${c.page};--raised:${c.raised};--ok:${c.ok};--bad:${c.bad};--neutral:${c.ink2}}`;

const page = `@page{size:A4 portrait;margin:10mm}
*{box-sizing:border-box}
body{margin:0;color:var(--ink);font:400 14px/1.6 'IBM Plex Sans Arabic','Amiri',sans-serif;
-webkit-print-color-adjust:exact;print-color-adjust:exact}
.ltr{direction:ltr;unicode-bidi:isolate;white-space:nowrap;font-variant-numeric:tabular-nums}
.frame{border:2px solid var(--gold);padding:4px;background:var(--raised);-webkit-box-decoration-break:clone;box-decoration-break:clone}
.inner{border:1px solid var(--gold-soft);padding-block:10px 8px;padding-inline:14px;
-webkit-box-decoration-break:clone;box-decoration-break:clone}
.amiri{font-family:'Amiri',serif;font-weight:700}`;

const header = `.head{text-align:center}
.logo{display:inline-block;border:1px solid var(--gold-soft);background:var(--paper);padding:3px;line-height:0}
.logo img{height:52px;width:auto}
.academy{margin:0;font:700 24px/1.35 'Amiri',serif;color:var(--green)}
.tagline{margin:0;font-size:13px;line-height:1.4;color:var(--ink3)}
.orn{display:flex;align-items:center;justify-content:center;gap:8px;margin-block:2px}
.orn .dash{width:96px;border-top:1px solid var(--gold-soft)}
.star{font-family:'Amiri',serif;color:var(--gold);font-size:15px;line-height:1}
.cartouche{display:inline-block;margin:2px 0 8px;padding-block:1px;padding-inline:22px;
border:1px solid var(--gold-soft);border-radius:6px;background:var(--tint);
font:700 20px/1.4 'Amiri',serif;color:var(--green)}`;

const meta = `.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
.cell{border:1px solid var(--rule);border-top:2px solid var(--gold-soft);text-align:center;padding-block:2px}
.cell .k{font-size:12px;line-height:1.4;color:var(--ink3)}
.cell .v{font-size:15px;line-height:1.4;font-weight:700;color:var(--green2)}
.cell .sub{font-size:12px;line-height:1.4;color:var(--ink3)}
.status{display:flex;align-items:center;gap:8px;margin-block:6px 0;font-size:13px}
.status .k{font-weight:600;color:var(--green)}`;

const chip = `.chip{display:inline-flex;align-items:center;gap:6px;padding-inline:10px;border:1px solid currentColor;
border-radius:999px;font-size:13px;font-weight:600;line-height:1.7}
.tone-ok{color:var(--ok)}.tone-bad{color:var(--bad)}.tone-neutral,.tone-act{color:var(--neutral)}
.nuqta{display:inline-block;width:8px;height:8px;transform:rotate(45deg);border:1.5px solid currentColor;position:relative}
.nuqta.fill{background:currentColor}
.nuqta.half{background:linear-gradient(135deg,currentColor 50%,transparent 50%)}
.nuqta.struck::after{content:'';position:absolute;inset-inline-start:-3px;top:2.5px;width:11px;border-top:1.5px solid currentColor;transform:rotate(-90deg)}`;

const sections = `.sec{display:flex;align-items:center;gap:8px;margin-block:6px 4px;padding-bottom:1px;
border-bottom:1px solid var(--gold);font:700 20px/1.35 'Amiri',serif;color:var(--green);break-after:avoid}
.fields{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.field{border:1px solid var(--rule);border-radius:6px;padding-block:2px 3px;padding-inline:10px;break-inside:avoid}
.field.wide{grid-column:1 / -1}
.field .k{font-size:12px;line-height:1.4;font-weight:600;color:var(--green)}
.field .v{font-size:14px;line-height:1.5;overflow-wrap:anywhere}`;

const grades = `.grades{display:grid;grid-template-columns:1fr 200px;gap:8px;break-inside:avoid}
.rubrics{border:1px solid var(--rule);border-radius:6px;padding-block:1px;padding-inline:10px}
.rubric{display:flex;align-items:center;gap:10px;padding-block:2px;border-bottom:1px dotted var(--rule)}
.rubric:last-child{border-bottom:0}
.rubric .k{flex:1;font-size:13px;line-height:1.5}
.rubric .w{min-width:112px;font-size:13px;line-height:1.5;font-weight:700;color:var(--green2);white-space:nowrap}
.pips{display:inline-flex;gap:5px}
.pip{display:inline-block;width:8px;height:8px;transform:rotate(45deg);border:1.5px solid var(--green2)}
.pip.on{background:var(--green2)}
.overall{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;
border:1px solid var(--gold-soft);border-radius:6px;background:var(--gold-wash);text-align:center;padding:6px}
.overall .k{font-size:12px;font-weight:600;color:var(--green)}
.overall .w{font:700 28px/1.25 'Amiri',serif;color:var(--green)}`;

const closing = `.signs{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:8px;padding-top:4px;
border-top:1px solid var(--rule);break-inside:avoid}
.signs .k{font-size:13px;font-weight:600;color:var(--green)}
.signs .line{height:18px;border-bottom:1px dashed var(--gold-soft)}
.dua{margin-top:8px;padding-block:2px;border-block:1px solid var(--gold-soft);text-align:center;
font-size:13px;color:var(--green2)}
.dua .star{font-size:16px}
.foot{margin-top:2px;text-align:center;font-size:12px;line-height:1.5;color:var(--green2)}
.foot .row{display:flex;justify-content:space-between;gap:12px;color:var(--ink3)}
.foot .pkg{font-weight:600;color:var(--green)}`;

export const REPORT_CSS = [tokens, page, header, meta, chip, sections, grades, closing].join('\n');
