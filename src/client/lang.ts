import { getLang, setLangValue, type Lang } from '../i18n';
import { HEROES } from '../sim/heroes';
import { MARK_INFO } from '../sim/run';
import { ARCH_NAME, KEYWORDS, SKILLS, type Keyword } from '../sim/skills';
import { ARCH_EN, BUILDINGS_EN, HEROES_EN, KEYWORDS_EN, MARKS_EN, SKILLS_EN, SLIDES_EN } from './i18n_en';
import { BUILDINGS } from './townData';
import { SLIDES } from './tutorialSlides';

/**
 * Language switch for the browser. Game data keeps its text in plain fields (name, desc, …) that the
 * UI reads on every render, so switching swaps those fields to the chosen language and re-renders.
 * The Thai originals are captured once at load; English comes from i18n_en.ts (missing → Thai).
 */

const LANG_KEY = 'mochi.lang';

const TH = {
  skills: Object.fromEntries(
    Object.values(SKILLS).map((d) => [d.id, Object.fromEntries(Object.entries(d.tree).map(([v, n]) => [v || '_', { name: n.name, style: n.style }]))]),
  ),
  kw: Object.fromEntries(Object.entries(KEYWORDS).map(([k, x]) => [k, { name: x.name, desc: x.desc }])),
  heroes: Object.fromEntries(HEROES.map((h) => [h.id, { name: h.name, passive: h.passive, style: h.style }])),
  arch: { ...ARCH_NAME } as Record<string, string>,
  marks: Object.fromEntries(Object.entries(MARK_INFO).map(([k, m]) => [k, { ...m }])),
  buildings: Object.fromEntries(BUILDINGS.map((b) => [b.id, { name: b.name, desc: b.desc, future: b.future }])),
  slides: SLIDES.map((s) => ({ title: s.title, body: [...s.body] })),
};

function apply(l: Lang) {
  const en = l === 'en';
  for (const d of Object.values(SKILLS)) {
    for (const [v, n] of Object.entries(d.tree)) {
      const key = v || '_';
      const th = TH.skills[d.id][key];
      const [name, style] = en && SKILLS_EN[d.id]?.[key] ? SKILLS_EN[d.id][key].split(' | ') : [th.name, th.style];
      n.name = name;
      if (th.style !== undefined) n.style = style ?? th.style;
    }
    d.name = d.tree[''].name;
  }
  for (const [k, x] of Object.entries(KEYWORDS)) Object.assign(x, (en && KEYWORDS_EN[k]) || TH.kw[k as Keyword]);
  for (const h of HEROES) Object.assign(h, (en && HEROES_EN[h.id]) || TH.heroes[h.id]);
  for (const k of Object.keys(ARCH_NAME) as (keyof typeof ARCH_NAME)[]) ARCH_NAME[k] = (en && ARCH_EN[k]) || TH.arch[k];
  for (const [k, m] of Object.entries(MARK_INFO)) Object.assign(m, (en && MARKS_EN[k]) || TH.marks[k]);
  for (const b of BUILDINGS) Object.assign(b, (en && BUILDINGS_EN[b.id]) || TH.buildings[b.id]);
  SLIDES.forEach((s, i) => Object.assign(s, (en && SLIDES_EN[i]) || TH.slides[i]));
}

const listeners: ((l: Lang) => void)[] = [];
/** Run `fn` after every language change (re-render panels, Phaser labels, header). */
export const onLang = (fn: (l: Lang) => void) => listeners.push(fn);

export function setLang(l: Lang) {
  setLangValue(l);
  apply(l);
  document.documentElement.lang = l;
  try {
    localStorage.setItem(LANG_KEY, l);
  } catch {
    /* private mode */
  }
  listeners.forEach((fn) => fn(l));
}

/** Saved choice, else the browser language (Thai browsers get Thai, everyone else English). */
export function initLang() {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(LANG_KEY);
  } catch {
    /* private mode */
  }
  const l: Lang = saved === 'th' || saved === 'en' ? saved : navigator.language?.toLowerCase().startsWith('th') ? 'th' : 'en';
  setLangValue(l);
  apply(l);
  document.documentElement.lang = l;
}

/** TH | EN switch in the header. */
export function mountLangSwitch() {
  const header = document.querySelector('header');
  if (!header || header.querySelector('.lang')) return;
  const box = document.createElement('span');
  box.className = 'lang';
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', 'Language / ภาษา');
  const draw = () => {
    box.innerHTML = (['th', 'en'] as Lang[])
      .map((l) => `<button class="small ${getLang() === l ? 'on' : 'ghost'}" data-lang="${l}" aria-pressed="${getLang() === l}">${l === 'th' ? 'ไทย' : 'EN'}</button>`)
      .join('');
  };
  box.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-lang]');
    if (b && b.dataset.lang !== getLang()) setLang(b.dataset.lang as Lang);
  });
  onLang(draw);
  draw();
  header.appendChild(box);
}
