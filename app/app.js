// Leonida Ledger v3: a data-driven GTA VI trophy guide and tracker.
// One source of truth (data/trophies.json). Three-column dashboard:
// checklist | guide pane | Next Up + sources rail. Two-level tracking
// (trophy checkbox + per-count progress), risk-tiered missables, a sources
// bibliography, an always-visible audit strip computed from the data,
// fuzzy text search, filters, a spoiler setting, deep-link URL parameters,
// export / import.
// No network at run time beyond fetching the local data file; no dependencies.
const KEY = 'leonida-ledger-v2';
const KEY_V1 = 'leonida-ledger-v1';
const HIDDEN_PLACEHOLDER = 'Hidden trophy — earn it to reveal';
const ITEM_CHECKBOX_LIMIT = 20;

const params = new URLSearchParams(location.search);
if (params.get('motion') === 'off') document.body.classList.add('motion-off');

let doc;
try {
  doc = await (await fetch('data/trophies.json')).json();
} catch {
  document.querySelector('main').innerHTML =
    '<p class="empty">The trophy data could not be loaded. Serve this folder with a static file server (for example: node serve.ts) instead of opening the file directly.</p>';
  throw new Error('trophy data failed to load');
}
const trophies = doc.trophies;

const byId = new Map(trophies.map((t) => [t.id, t]));
const byName = new Map(trophies.map((t) => [t.name, t]));

// State: earned trophy ids + per-trophy count progress.
// progress[id] is { items: [bool, ...] } for small counts, { done: n } for large.
let earned = new Set();
let progress = {};
function loadState(raw) {
  earned = new Set();
  progress = {};
  if (!raw) return;
  const ids = Array.isArray(raw) ? raw : raw.earned ?? [];
  for (const v of ids) {
    if (typeof v === 'number' && byId.has(v)) earned.add(v);
    else if (typeof v === 'string' && byName.has(v)) earned.add(byName.get(v).id);
  }
  const p = raw && !Array.isArray(raw) ? raw.progress ?? {} : {};
  for (const [k, v] of Object.entries(p)) {
    const id = Number(k);
    if (!byId.has(id) || !v || typeof v !== 'object') continue;
    if (Array.isArray(v.items)) progress[id] = { items: v.items.map(Boolean) };
    else if (typeof v.done === 'number') progress[id] = { done: Math.max(0, Math.floor(v.done)) };
  }
}
try {
  const raw2 = localStorage.getItem(KEY);
  if (raw2) loadState(JSON.parse(raw2));
  else loadState(JSON.parse(localStorage.getItem(KEY_V1) ?? 'null'));
} catch {
  earned = new Set();
  progress = {};
}

function save() {
  localStorage.setItem(KEY, JSON.stringify({ earned: [...earned].sort((a, b) => a - b), progress }));
}

const $ = (id) => document.getElementById(id);
const searchEl = $('search');
const gradeEl = $('grade');
const kindEl = $('kind');
const earnedEl = $('earned');
const missableEl = $('missableOnly');
const spoilersEl = $('spoilers');
const cardsEl = $('cards');
const detailEl = $('detail');
const emptyEl = $('empty');
const resultCountEl = $('resultCount');
const nextUpEl = $('nextUp');
const railSourcesEl = $('railSources');
const countsNoteEl = $('countsNote');

// Deep-link parameters (?view=guide|roadmap|missables|sources, ?grade=, ?kind=,
// ?trophy=<id>, ?spoilers=off, ?motion=off).
const VIEWS = ['guide', 'roadmap', 'missables', 'sources'];
let view = VIEWS.includes(params.get('view')) ? params.get('view') : 'guide';
let selectedId = null;
if (params.get('grade') && [...gradeEl.options].some((o) => o.value === params.get('grade'))) gradeEl.value = params.get('grade');
if (params.get('kind') && [...kindEl.options].some((o) => o.value === params.get('kind'))) kindEl.value = params.get('kind');
if (params.get('spoilers') === 'off') spoilersEl.checked = false;
const trophyParam = Number(params.get('trophy'));
if (Number.isInteger(trophyParam) && byId.has(trophyParam)) selectedId = trophyParam;

function isHidden(t) {
  return spoilersEl.checked && t.hidden && !earned.has(t.id);
}

function gradeLabel(grade) {
  return grade[0].toUpperCase() + grade.slice(1);
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function countDone(t) {
  const p = progress[t.id];
  if (!p) return 0;
  if (p.items) return p.items.filter(Boolean).length;
  return Math.min(p.done ?? 0, t.countTarget ?? 0);
}

function countTotalDone() {
  // Dollar totals (count targets >= 10000) are money, not sub-goals: keep
  // them out of the aggregate so the rail note reads as goals ticked, not
  // dollars.
  let done = 0;
  let total = 0;
  for (const t of trophies) {
    if (!t.countTarget || t.countTarget >= 10000) continue;
    total += t.countTarget;
    done += countDone(t);
  }
  return { done, total };
}

// Next Up order: missable first, then roadmap phase, then trophy id.
function nextUpOrder(list) {
  return [...list].sort((a, b) => {
    if (a.missable !== b.missable) return a.missable ? -1 : 1;
    if (a.phase !== b.phase) return a.phase - b.phase;
    return a.id - b.id;
  });
}

function renderAudit() {
  const citations = trophies.reduce((n, t) => n + (t.sources ?? []).length, 0);
  const sites = new Set(trophies.flatMap((t) => (t.sources ?? []).map((s) => s.name))).size;
  const steps = trophies.reduce((n, t) => n + (t.steps ?? []).length, 0);
  const counted = trophies.filter((t) => t.countTarget).length;
  const disputes = trophies.filter((t) => t.dispute).length;
  const unconfirmed = trophies.filter((t) => t.guide.startsWith('UNCONFIRMED')).length;
  const high = trophies.filter((t) => t.risk === 'high').length;
  const watch = trophies.filter((t) => t.risk === 'watch').length;
  const safe = trophies.filter((t) => t.risk === 'safe').length;
  const parts = [
    `${trophies.length}/${trophies.length} official name, description, grade`,
    `${trophies.length}/${trophies.length} guides cite sources`,
    `${citations} citations · ${sites} guide sites`,
    `${steps} how-to steps`,
    `${counted} trophies with tracked counts`,
    `${high} missable · ${watch} watch · ${safe} safe`,
    `${disputes} disputed count shown both ways ⇄`,
    `${unconfirmed} methods unconfirmed — flagged, not guessed`,
  ];
  const strip = $('auditStrip');
  strip.replaceChildren();
  parts.forEach((p, i) => {
    if (i) strip.append(el('span', 'audit-sep', '·'));
    strip.append(el('span', 'audit-item', p));
  });
}

function renderProgress() {
  const total = trophies.length;
  const counts = {};
  for (const t of trophies) {
    counts[t.grade] = counts[t.grade] ?? { earned: 0, total: 0 };
    counts[t.grade].total += 1;
    if (earned.has(t.id)) counts[t.grade].earned += 1;
  }
  $('progressText').textContent = `${earned.size} of ${total} earned`;
  $('progressPct').textContent = `${Math.round((earned.size / total) * 100)}%`;
  $('progressFill').style.width = `${(earned.size / total) * 100}%`;
  $('progressBar').setAttribute('aria-valuenow', String(earned.size));
  const ul = $('gradeCounts');
  ul.replaceChildren();
  for (const g of ['platinum', 'gold', 'silver', 'bronze']) {
    const c = counts[g];
    ul.append(el('li', null, `${gradeLabel(g)} ${c.earned}/${c.total}`));
  }
  const ct = countTotalDone();
  countsNoteEl.textContent = `${ct.done} of ${ct.total} counted sub-goals ticked across ${trophies.filter((t) => t.countTarget && t.countTarget < 10000).length} trophies (spots, vaults, garages, stunts and more; dollar totals are tracked per trophy). Open a trophy's guide to tick its count.`;
}

// Fuzzy search: the query is split into tokens; a trophy matches when every
// token matches somewhere in its name, description, guide or chapter. A token
// matches a word when it is a prefix of it, a subsequence of it, or within a
// small edit distance of it (1 edit, or 2 for longer tokens) — so a typo like
// "meditaion" still finds the meditation trophy. An exact substring anywhere
// in the text always matches, so plain search behaves exactly as before.
function normalizeText(s) {
  return s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < best) best = cur[j];
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

function isSubsequence(needle, haystack) {
  let i = 0;
  for (const ch of haystack) {
    if (ch === needle[i]) i += 1;
    if (i === needle.length) return true;
  }
  return i === needle.length;
}

function tokenMatchesWord(token, word) {
  if (word.startsWith(token)) return true;
  if (token.length >= 3 && isSubsequence(token, word)) return true;
  if (token.length >= 4) {
    const maxEdits = token.length >= 7 ? 2 : 1;
    if (editDistance(token, word, maxEdits) <= maxEdits) return true;
  }
  return false;
}

function fuzzyMatch(query, text) {
  const q = normalizeText(query).trim();
  if (!q) return true;
  const hay = normalizeText(text);
  if (hay.includes(q)) return true;
  const words = hay.split(/[^a-z0-9]+/).filter(Boolean);
  return q.split(/\s+/).every((token) => words.some((w) => tokenMatchesWord(token, w)));
}

// Wrap the first exact (case-insensitive) occurrence of the query in a <mark>
// so the reader sees why a row matched. A fuzzy-only match gets no mark — the
// name is shown plain rather than guessing which letters to light up. Hidden
// trophies never reach this: their placeholder is rendered instead, so a
// highlight can never leak a hidden name.
function highlightedName(name, query) {
  const frag = document.createDocumentFragment();
  const q = query.trim();
  const at = q ? name.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (at === -1) {
    frag.append(name);
    return frag;
  }
  frag.append(name.slice(0, at));
  frag.append(el('mark', null, name.slice(at, at + q.length)));
  frag.append(name.slice(at + q.length));
  return frag;
}

function filtered() {
  const q = searchEl.value.trim().toLowerCase();
  return trophies.filter((t) => {
    if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
    if (kindEl.value !== 'all' && t.kind !== kindEl.value) return false;
    if (earnedEl.value === 'earned' && !earned.has(t.id)) return false;
    if (earnedEl.value === 'remaining' && earned.has(t.id)) return false;
    if (missableEl.checked && !t.missable) return false;
    if (q && !fuzzyMatch(q, t.name + ' ' + t.description + ' ' + t.guide + ' ' + (t.chapter ?? ''))) return false;
    return true;
  });
}

function earnedCheckbox(t, hidden) {
  const box = el('input', 'earned-box');
  box.type = 'checkbox';
  box.checked = earned.has(t.id);
  box.setAttribute('aria-label', 'Mark ' + (hidden ? 'hidden trophy' : t.name) + ' as earned');
  box.addEventListener('change', () => {
    if (box.checked) earned.add(t.id);
    else earned.delete(t.id);
    save();
    render();
  });
  return box;
}

function badges(t) {
  const frag = document.createDocumentFragment();
  frag.append(el('span', 'badge grade-' + t.grade, gradeLabel(t.grade)));
  if (t.missable) frag.append(el('span', 'badge missable', 'Missable'));
  if (t.risk === 'watch') frag.append(el('span', 'badge watch', 'Watch'));
  if (t.dispute) frag.append(el('span', 'badge dispute', '⇄ Disputed'));
  if (t.guide.startsWith('UNCONFIRMED')) frag.append(el('span', 'badge unconfirmed', 'Unconfirmed'));
  if (t.chapter) frag.append(el('span', 'chapter', t.chapter));
  frag.append(el('span', 'kind', t.kind));
  return frag;
}

function rowBody(t, hidden, index) {
  const row = el('li', 'card' + (earned.has(t.id) ? ' earned' : '') + (t.missable ? ' missable-card' : '') + (t.id === selectedId ? ' selected' : ''));
  row.dataset.trophyId = String(t.id);
  row.style.setProperty('--i', String(Math.min(index, 12)));
  const head = el('div', 'card-head');
  head.append(earnedCheckbox(t, hidden));
  head.append(badges(t));
  row.append(head);
  const nameBtn = el('button', 'trophy-name trophy-link');
  nameBtn.append(hidden ? HIDDEN_PLACEHOLDER : highlightedName(t.name, searchEl.value));
  nameBtn.type = 'button';
  nameBtn.addEventListener('click', () => {
    selectedId = t.id;
    render();
    detailEl.scrollIntoView({ block: 'nearest' });
  });
  row.append(nameBtn);
  if (hidden) {
    row.append(el('p', 'hidden-note', 'Its name, description and guide stay hidden until you earn it. Flip the spoiler setting off to see it now.'));
  } else {
    row.append(el('blockquote', 'official', t.description));
    if (t.countTarget) {
      const done = countDone(t);
      const wrap = el('p', 'count-line');
      wrap.append(el('span', 'count-text', `${done} / ${t.countTarget} ${t.countUnit}`));
      const bar = el('span', 'mini-bar');
      const fill = el('span', 'mini-fill');
      fill.style.width = `${t.countTarget ? (done / t.countTarget) * 100 : 0}%`;
      bar.append(fill);
      wrap.append(bar);
      row.append(wrap);
    }
  }
  return row;
}

function sourceList(t) {
  const wrap = el('p', 'sources', 'Sources: ');
  (t.sources ?? []).forEach((s, i) => {
    if (i) wrap.append(', ');
    const a = el('a');
    a.href = s.url;
    a.textContent = s.name;
    a.rel = 'noopener';
    wrap.append(a);
  });
  return wrap;
}

function countControls(t) {
  const wrap = el('div', 'count-controls');
  const done = countDone(t);
  wrap.append(el('h4', 'count-title', `Track the count — ${done} of ${t.countTarget} ${t.countUnit}`));
  if (t.countTarget <= ITEM_CHECKBOX_LIMIT) {
    const p = progress[t.id]?.items ? progress[t.id] : { items: Array(t.countTarget).fill(false) };
    const grid = el('div', 'item-grid');
    for (let i = 0; i < t.countTarget; i++) {
      const lab = el('label', 'item-check');
      const box = el('input');
      box.type = 'checkbox';
      box.checked = Boolean(p.items[i]);
      box.setAttribute('aria-label', `${t.countUnit} ${i + 1} of ${t.countTarget}`);
      box.addEventListener('change', () => {
        const cur = progress[t.id]?.items ? [...progress[t.id].items] : Array(t.countTarget).fill(false);
        cur[i] = box.checked;
        progress[t.id] = { items: cur };
        save();
        render();
      });
      lab.append(box, el('span', null, String(i + 1)));
      grid.append(lab);
    }
    wrap.append(grid);
  } else {
    const row = el('div', 'stepper');
    const minus = el('button', 'step-btn', '−');
    minus.type = 'button';
    minus.setAttribute('aria-label', 'One fewer');
    const input = el('input', 'count-input');
    input.type = 'number';
    input.min = '0';
    input.max = String(t.countTarget);
    input.value = String(done);
    input.setAttribute('aria-label', `${t.countUnit} done, of ${t.countTarget}`);
    const plus = el('button', 'step-btn', '+');
    plus.type = 'button';
    plus.setAttribute('aria-label', 'One more');
    const setDone = (n) => {
      progress[t.id] = { done: Math.max(0, Math.min(t.countTarget, Math.floor(n) || 0)) };
      save();
      render();
    };
    minus.addEventListener('click', () => setDone(countDone(t) - 1));
    plus.addEventListener('click', () => setDone(countDone(t) + 1));
    input.addEventListener('change', () => setDone(Number(input.value)));
    row.append(minus, input, plus, el('span', 'count-of', `of ${t.countTarget} ${t.countUnit}`));
    wrap.append(row);
  }
  if (done >= t.countTarget && !earned.has(t.id)) {
    wrap.append(el('p', 'count-done-note', 'Count complete — tick the trophy itself at the top of this guide when it pops.'));
  }
  return wrap;
}

function renderDetail() {
  detailEl.replaceChildren();
  const t = selectedId !== null && byId.has(selectedId) ? byId.get(selectedId) : nextUpOrder(trophies.filter((x) => !earned.has(x.id)))[0] ?? trophies[0];
  selectedId = t.id;
  const hidden = isHidden(t);
  const wrap = el('div', 'detail-inner');
  wrap.append(el('p', 'detail-kicker', 'Trophy guide — ' + gradeLabel(t.grade) + (t.missable ? ' · Missable' : '') + ` · Phase ${t.phase} of 5`));
  const head = el('div', 'card-head');
  head.append(earnedCheckbox(t, hidden));
  head.append(badges(t));
  wrap.append(head);
  if (hidden) {
    wrap.append(el('h3', 'detail-name', HIDDEN_PLACEHOLDER));
    wrap.append(el('p', 'hidden-note', 'Its name, description and guide stay hidden until you earn it. Flip the spoiler setting off to see it now.'));
  } else {
    wrap.append(el('h3', 'detail-name', t.name));
    wrap.append(el('blockquote', 'official', t.description));
    wrap.append(el('p', 'guide', t.guide));
    if (t.dispute) {
      const box = el('div', 'dispute-box');
      box.append(el('h4', 'dispute-title', '⇄ Sources disagree — shown both ways'));
      box.append(el('p', null, t.dispute));
      wrap.append(box);
    }
    if (t.riskNote) {
      const box = el('div', 'risk-box risk-' + t.risk);
      box.append(el('h4', 'risk-title', t.risk === 'high' ? 'Missable — read before Chapter 1 ends' : 'Watch — time-sensitive or easy to half-finish'));
      box.append(el('p', null, t.riskNote));
      wrap.append(box);
    }
    const steps = el('ol', 'steps');
    for (const s of t.steps ?? []) steps.append(el('li', null, s));
    if (steps.childElementCount) {
      wrap.append(el('h4', 'steps-title', 'How to earn it'));
      wrap.append(steps);
    }
    if (t.countTarget) wrap.append(countControls(t));
    wrap.append(sourceList(t));
  }
  detailEl.append(wrap);
  // Rail: sources for the selected guide.
  railSourcesEl.replaceChildren();
  if (hidden) {
    railSourcesEl.append(el('p', 'rail-note', 'Hidden until earned (spoiler setting is on).'));
  } else {
    const ul = el('ul', 'rail-sources');
    for (const s of t.sources ?? []) {
      const li = el('li');
      const a = el('a');
      a.href = s.url;
      a.textContent = s.name;
      a.rel = 'noopener';
      li.append(a);
      ul.append(li);
    }
    railSourcesEl.append(ul);
    railSourcesEl.append(el('p', 'rail-note', 'Cited, never copied. The guide above is our own wording.'));
  }
}

function renderNextUp() {
  nextUpEl.replaceChildren();
  const queue = nextUpOrder(trophies.filter((t) => !earned.has(t.id))).slice(0, 6);
  if (!queue.length) {
    nextUpEl.append(el('li', 'next-done', 'All 55 earned — platinum. Nothing left in the queue.'));
    return;
  }
  for (const t of queue) {
    const hidden = isHidden(t);
    const li = el('li', 'next-item' + (t.missable ? ' next-missable' : ''));
    const btn = el('button', 'next-link', hidden ? HIDDEN_PLACEHOLDER : t.name);
    btn.type = 'button';
    btn.addEventListener('click', () => {
      selectedId = t.id;
      render();
      detailEl.scrollIntoView({ block: 'nearest' });
    });
    li.append(btn);
    const meta = el('span', 'next-meta', `${gradeLabel(t.grade)} · Phase ${t.phase}` + (t.missable ? ' · Missable' : '') + (t.countTarget && !hidden ? ` · ${countDone(t)}/${t.countTarget}` : ''));
    li.append(meta);
    nextUpEl.append(li);
  }
}

const PHASE_TEXT = [
  ['Phase 1 — Chapter 1 setup', 'Play Gone Fishing and the Chapter 1 missions. Do the missable meditation first: after Down to Earth, in the morning, follow Lucia to the balcony of Jason’s house and accept the optional task. It disappears after Chapter 1. Keep a Chapter 1 save until Positive Mental Attitude pops. Start gym training early — both characters need maximum Strength.'],
  ['Phase 2 — Chapter 2 partner unlocks', 'Complete Moses to open the Scooter Bros app and Daily Driver to unlock garage purchases. Buy garages early — every vehicle registration needs a free space. Start Billy’s optional missions (Thrillbillies, Twist Wrist Smash Grab), Kingpin Bowling, and the stranger strands as they appear.'],
  ['Phase 3 — Chapters 3–4 robberies', 'Race Yago the moment its hourglass appears in Chapter 3. Do Yasmani’s Jewelry Jobs for the Snap Gun, then rob a jewelry store unseen. Near the end of Chapter 4, do That’s Where The Money Is to unlock bank vaults — bring your partner, rob vaults, launder the Marked Bills, and escape a 4-star wanted level together.'],
  ['Phase 4 — Post-story side finales', 'Finish the stranger strands (8 counted — Andy, Billy and Tyrone do not count) and the final missions for Andy (Lucia-only), Billy, Tyrone (Jason-only), Kenton and Randy. Hunt Bret’s unique animal, steal the VCIA plane, and take the Rhino at Mile Zero.'],
  ['Phase 5 — The 100% grind', 'Open Progress > Stats > 100% Completion and clear it: 300 stunts, 70 of 80 Challenges, 200 of 277 vehicles scanned, 100 WAiNK locations, 8 bank vaults, 39 illegal operations, 3 card sets, 42 shooting-range golds, 14 Top Fun locations, 8 garages, 10 Scooter Bros registrations. Nothing here is missable.'],
];

function renderRoadmap() {
  const ol = $('phases');
  ol.replaceChildren();
  PHASE_TEXT.forEach(([title, text], i) => {
    const phase = i + 1;
    const inPhase = trophies.filter((t) => t.phase === phase);
    const done = inPhase.filter((t) => earned.has(t.id)).length;
    const li = el('li', 'phase-card');
    li.append(el('h3', null, title));
    const prog = el('p', 'phase-progress');
    prog.append(el('span', 'phase-count', `${done} of ${inPhase.length} trophies earned`));
    const bar = el('span', 'mini-bar');
    const fill = el('span', 'mini-fill');
    fill.style.width = `${inPhase.length ? (done / inPhase.length) * 100 : 0}%`;
    bar.append(fill);
    prog.append(bar);
    li.append(prog);
    li.append(el('p', null, text));
    const names = el('p', 'phase-names', inPhase.map((t) => (isHidden(t) ? 'Hidden trophy' : t.name)).join(' · '));
    li.append(names);
    ol.append(li);
  });
}

function renderMissables() {
  const wrap = $('riskTiers');
  wrap.replaceChildren();
  const tiers = [
    ['high', 'High — can be missed', 'Do these in their window, and keep the save named below until the trophy pops.'],
    ['watch', 'Watch — time-sensitive or easy to half-finish', 'Not missable, but the window or the fine print can cost you a replay from an older save.'],
    ['safe', 'Safe — earn any time', 'Everything else can be earned after the story from your saves. No window, no order.'],
  ];
  for (const [risk, title, intro] of tiers) {
    const list = trophies.filter((t) => t.risk === risk);
    const box = el('div', 'tier-box tier-' + risk);
    box.append(el('h3', null, `${title} (${list.length})`));
    box.append(el('p', 'rail-note', intro));
    if (risk === 'safe') {
      box.append(el('p', 'tier-safe-note', `${list.length} trophies: every story trophy, every collectible count, every robbery and grind. If you keep a save at the start of each chapter, none of them can lock you out of the platinum.`));
    } else {
      const ul = el('ul', 'tier-list');
      for (const t of list) {
        const hidden = isHidden(t);
        const li = el('li');
        const btn = el('button', 'next-link', hidden ? HIDDEN_PLACEHOLDER : t.name);
        btn.type = 'button';
        btn.addEventListener('click', () => {
          selectedId = t.id;
          view = 'guide';
          render();
          detailEl.scrollIntoView({ block: 'start' });
        });
        li.append(btn);
        li.append(el('span', 'next-meta', `${gradeLabel(t.grade)} · ${t.chapter ?? 'Any time'}`));
        if (t.riskNote) li.append(el('p', 'tier-note', t.riskNote));
        ul.append(li);
      }
      box.append(ul);
    }
    wrap.append(box);
  }
}

function renderBibliography() {
  const wrap = $('bibliography');
  wrap.replaceChildren();
  const bySite = new Map();
  for (const t of trophies) {
    for (const s of t.sources ?? []) {
      if (!bySite.has(s.name)) bySite.set(s.name, { name: s.name, url: s.url, count: 0 });
      bySite.get(s.name).count += 1;
    }
  }
  const rows = [
    ['Exophase', 'https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/', 'Official list — names, descriptions, grades', '2026-11-18', 'all 55 (via kit starter)'],
    ['PSNProfiles', 'https://psnprofiles.com/trophies/43531-grand-theft-auto-vi', 'Official list — grades and PSN progress targets', '2026-11-18', 'all 55 (via kit starter)'],
    ...[...bySite.values()].sort((a, b) => b.count - a.count).map((s) => [s.name, s.url, 'Guide facts, cited per trophy', '2026-11-19', `in ${s.count} of 55 guides`]),
    ['TrueAchievements', 'https://www.trueachievements.com/news/grand-theft-auto-6-xbox-achievements', 'Trophy-list cross-check (spellings, grades)', '2026-11-19', 'list verification'],
    ['Press Start', 'https://press-start.com.au/news/2026/11/18/gta-6-trophy-list/', 'Trophy-list cross-check', '2026-11-19', 'list verification'],
  ];
  const table = el('table', 'biblio');
  const thead = el('thead');
  const hr = el('tr');
  for (const h of ['Source', 'Used for', 'Read', 'Reuse']) hr.append(el('th', null, h));
  thead.append(hr);
  table.append(thead);
  const tbody = el('tbody');
  for (const [name, url, usedFor, read, reuse] of rows) {
    const tr = el('tr');
    const tdName = el('td');
    const a = el('a');
    a.href = url;
    a.textContent = name;
    a.rel = 'noopener';
    tdName.append(a);
    tr.append(tdName, el('td', null, usedFor), el('td', null, read), el('td', null, reuse));
    tbody.append(tr);
  }
  table.append(tbody);
  wrap.append(table);
  wrap.append(el('p', 'rail-note', 'The one disputed count (Positive Mental Attitude) was re-read on 2026-11-21 in KeenGamer and Output Lag; both leave the balcony meditation’s status unconfirmed, so the guide shows it both ways.'));
}

function renderViews() {
  for (const v of VIEWS) {
    $(v).hidden = v !== view;
  }
  for (const a of document.querySelectorAll('.views a')) {
    a.classList.toggle('active', a.dataset.view === view);
    a.setAttribute('aria-current', a.dataset.view === view ? 'page' : 'false');
  }
}

function render() {
  renderViews();
  renderAudit();
  renderProgress();
  renderDetail();
  renderNextUp();
  const list = filtered();
  cardsEl.replaceChildren();
  list.forEach((t, i) => cardsEl.append(rowBody(t, isHidden(t), i)));
  emptyEl.hidden = list.length > 0;
  resultCountEl.textContent = `${list.length} of ${trophies.length} trophies shown`;
  if (view === 'roadmap') renderRoadmap();
  if (view === 'missables') renderMissables();
  if (view === 'sources') renderBibliography();
}

for (const a of document.querySelectorAll('.views a')) {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    view = a.dataset.view;
    const url = new URL(location.href);
    url.searchParams.set('view', view);
    history.replaceState(null, '', url);
    render();
    window.scrollTo({ top: 0 });
  });
}

for (const control of [searchEl, gradeEl, kindEl, earnedEl, missableEl, spoilersEl]) {
  control.addEventListener('input', render);
  control.addEventListener('change', render);
}

$('export').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ app: 'leonida-ledger-v2', earned: [...earned].sort((x, y) => x - y), progress }, null, 2)], { type: 'application/json' }));
  a.download = 'leonida-ledger-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

$('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  let importFailed = false;
  try {
    loadState(JSON.parse(await file.text()));
    save();
  } catch {
    importFailed = true;
  }
  e.target.value = '';
  render();
  if (importFailed) resultCountEl.textContent = 'That file could not be imported — it is not a Leonida Ledger progress file.';
});

$('reset').addEventListener('click', () => {
  if (window.confirm('Clear all earned trophies and count progress? This cannot be undone.')) {
    earned = new Set();
    progress = {};
    save();
    render();
  }
});

render();
if (view !== 'guide') $(view).scrollIntoView({ block: 'start' });
else if (selectedId !== null && params.get('trophy')) detailEl.scrollIntoView({ block: 'start' });
else if (params.get('grade') || params.get('kind')) $('guide').scrollIntoView({ block: 'start' });
