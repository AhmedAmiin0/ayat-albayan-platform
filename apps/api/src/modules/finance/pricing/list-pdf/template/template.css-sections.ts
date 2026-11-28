const cards = `.cards,.promises{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.card{padding:10px 12px;border:1px solid var(--gold-soft);border-radius:12px;background:var(--paper)}
.card h3,.program h3,.promise h3{font:700 16px/1.4 'Amiri',serif;color:var(--deep)}
.card .sub{font-size:10.5px;color:var(--ink3);margin-bottom:4px}
.card .one{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px}
.card .one small{display:inline}
.card .one .was{display:inline}
.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.tile{padding:5px;border-radius:8px;background:var(--mint);text-align:center}`;

const about = `.programs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.program{padding:8px 12px;border:1px solid var(--rule);border-inline-start:4px solid var(--green2);
border-radius:10px}
.program ul{padding-inline-start:16px;font-size:11px}
.features{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.feature{padding:10px 6px;border-radius:10px;background:var(--deep);color:var(--paper);
text-align:center}
.feature b{display:block;font-size:12.5px;color:var(--gold-soft)}
.feature small{color:var(--paper);opacity:.85}
.promise{padding:10px 12px;border-radius:12px;font-size:11px}
.promise.mint{background:var(--mint);border:1px solid var(--mint2)}
.promise.gold{background:var(--cream);border:1px solid var(--gold-soft)}
.promise.gold h3{color:var(--brown)}`;

const foot = `.foot{display:flex;align-items:center;justify-content:space-between;gap:10px;
margin-top:auto;margin-bottom:-10px;padding:14px 10mm;background:var(--deep);color:var(--paper)}
.foot h2{font:700 19px/1.4 'Amiri',serif;color:var(--gold-soft)}
.foot p{font-size:11.5px}
.contact{display:flex;flex-direction:column;gap:4px;align-items:flex-end;flex:none}`;

export const SECTIONS_CSS = [cards, about, foot].join('\n');
