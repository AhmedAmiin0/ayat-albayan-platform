import { AR, esc } from '@/modules/reporting/report-pdf';
import { sectionHtml } from './template.table';

const D = () => AR.pricing.pdf;

function programHtml(p: { title: string; p1: string; p2: string; p3: string; p4: string }): string {
  const points = [p.p1, p.p2, p.p3, p.p4].map((t) => `<li>${esc(t)}</li>`).join('');
  return `<article class="program"><h3>${esc(p.title)}</h3><ul>${points}</ul></article>`;
}

function programsHtml(): string {
  const { quran, arabic, islamic, title, caption } = D().programs;
  const cards = [quran, arabic, islamic].map(programHtml).join('');
  return `${sectionHtml(title, caption)}<section class="programs">${cards}</section>`;
}

function featuresHtml(): string {
  const { private: one, licensed, reports, women } = D().features;
  const tiles = [one, licensed, reports, women].map(
    (f) => `<div class="feature"><b>${esc(f.title)}</b><small>${esc(f.sub)}</small></div>`,
  );
  return `<section class="features">${tiles.join('')}</section>`;
}

function promisesHtml(): string {
  const { trial, guarantee } = D();
  const card = (tone: string, c: { title: string; body: string }) =>
    `<article class="promise ${tone}"><h3>${esc(c.title)}</h3><p>${esc(c.body)}</p></article>`;
  return `<section class="promises">${card('mint', trial)}${card('gold', guarantee)}</section>`;
}

/** The fixed part of the page: programmes, what every lesson has, the trial and the guarantee. */
export function aboutHtml(): string {
  return [programsHtml(), featuresHtml(), promisesHtml()].join('');
}
