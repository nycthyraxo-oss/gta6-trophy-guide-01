// Leonida Ledger: a data-driven GTA VI trophy guide and tracker.
// One source of truth (data/trophies.json), checklist state in localStorage,
// filters, a spoiler setting, deep-link URL parameters, export / import / reset.
// No network at run time beyond fetching the local data file; no dependencies.
const KEY = 'leonida-ledger-v1';
const HIDDEN_PLACEHOLDER = 'Hidden trophy — earn it to reveal';

const params = new URLSearchParams(location.search);
const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;

const byId = new Map(trophies.map((t) => [t.id, t]));
const byName = new Map(trophies.map((t) => [t.name, t]));

// Checklist state: a set of earned trophy ids. Older exports stored names;
// import accepts both, so a name-only file still restores progress.
let earned = new Set();
try {
  const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
  const ids = Array.isArray(raw) ? raw : raw.earned ?? [];
  for (const v of ids) {
    if (typeof v === 'number' && byId.has(v)) earned.add(v);
    else if (typeof v === 'string' && byName.has(v)) earned.add(byName.get(v).id);
  }
} catch {
  earned = new Set();
}

function save() {
  localStorage.setItem(KEY, JSON.stringify({ earned: [...earned].sort((a, b) => a - b) }));
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

// Deep-link parameters (?view=roadmap|guide, ?grade=, ?kind=, ?trophy=<id>, ?spoilers=off).
let openId = null;
if (params.get('view') === 'roadmap') {
  document.getElementById('roadmap').scrollIntoView();
}
if (params.get('grade') && [...gradeEl.options].some((o) => o.value === params.get('grade'))) gradeEl.value = params.get('grade');
if (params.get('kind') && [...kindEl.options].some((o) => o.value === params.get('kind'))) kindEl.value = params.get('kind');
if (params.get('spoilers') === 'off') spoilersEl.checked = false;
const trophyParam = Number(params.get('trophy'));
if (Number.isInteger(trophyParam) && byId.has(trophyParam)) openId = trophyParam;

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

function cardBody(t, hidden) {
  const card = el('li', 'card' + (earned.has(t.id) ? ' earned' : '') + (t.missable ? ' missable-card' : ''));
  card.dataset.trophyId = String(t.id);
  const head = el('div', 'card-head');
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
  head.append(box);
  head.append(el('span', 'badge grade-' + t.grade, gradeLabel(t.grade)));
  if (t.missable) head.append(el('span', 'badge missable', 'Missable'));
  if (t.chapter) head.append(el('span', 'chapter', t.chapter));
  head.append(el('span', 'kind', t.kind));
  card.append(head);
  if (hidden) {
    card.append(el('h3', 'trophy-name', HIDDEN_PLACEHOLDER));
    card.append(el('p', 'hidden-note', 'Its name, description and guide stay hidden until you earn it. Flip the spoiler setting off to see it now.'));
  } else {
    card.append(el('h3', 'trophy-name', t.name));
    card.append(el('blockquote', 'official', t.description));
    card.append(el('p', 'guide', t.guide));
    const steps = el('ol', 'steps');
    for (const s of t.steps ?? []) steps.append(el('li', null, s));
    if (steps.childElementCount) card.append(steps);
    card.append(sourceList(t));
  }
  return card;
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
}

function filtered() {
  const q = searchEl.value.trim().toLowerCase();
  return trophies.filter((t) => {
    if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
    if (kindEl.value !== 'all' && t.kind !== kindEl.value) return false;
    if (earnedEl.value === 'earned' && !earned.has(t.id)) return false;
    if (earnedEl.value === 'remaining' && earned.has(t.id)) return false;
    if (missableEl.checked && !t.missable) return false;
    if (q && !(t.name + ' ' + t.description + ' ' + t.guide + ' ' + (t.chapter ?? '')).toLowerCase().includes(q)) return false;
    return true;
  });
}

function renderDetail() {
  if (openId === null || !byId.has(openId)) {
    detailEl.hidden = true;
    detailEl.replaceChildren();
    return;
  }
  const t = byId.get(openId);
  detailEl.hidden = false;
  detailEl.replaceChildren();
  const wrap = el('div', 'detail-inner');
  wrap.append(el('p', 'detail-kicker', 'Trophy guide — ' + gradeLabel(t.grade) + (t.missable ? ' · Missable' : '')));
  const body = cardBody(t, isHidden(t));
  body.classList.add('detail-card');
  wrap.append(body);
  const close = el('button', 'detail-close', 'Close guide');
  close.type = 'button';
  close.addEventListener('click', () => {
    openId = null;
    render();
  });
  wrap.append(close);
  detailEl.append(wrap);
}

let detailScrolled = false;

function render() {
  renderProgress();
  renderDetail();
  const list = filtered();
  cardsEl.replaceChildren();
  for (const t of list) cardsEl.append(cardBody(t, isHidden(t)));
  emptyEl.hidden = list.length > 0;
  resultCountEl.textContent = `${list.length} of ${trophies.length} trophies shown`;
  // Deep link (?trophy=<id>): bring the open guide into view once, on first render.
  if (openId !== null && !detailScrolled) {
    detailScrolled = true;
    detailEl.scrollIntoView({ block: 'start' });
  } else if (!detailScrolled && (params.get('grade') || params.get('kind'))) {
    // A filter deep link (?grade= / ?kind=) lands on the filtered guide list.
    detailScrolled = true;
    document.getElementById('guide').scrollIntoView({ block: 'start' });
  }
}

for (const control of [searchEl, gradeEl, kindEl, earnedEl, missableEl, spoilersEl]) {
  control.addEventListener('input', render);
  control.addEventListener('change', render);
}

$('export').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ app: 'leonida-ledger-v1', earned: [...earned].sort((x, y) => x - y) }, null, 2)], { type: 'application/json' }));
  a.download = 'leonida-ledger-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

$('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  let importFailed = false;
  try {
    const raw = JSON.parse(await file.text());
    const ids = Array.isArray(raw) ? raw : raw.earned ?? [];
    const next = new Set();
    for (const v of ids) {
      if (typeof v === 'number' && byId.has(v)) next.add(v);
      else if (typeof v === 'string' && byName.has(v)) next.add(byName.get(v).id);
    }
    earned = next;
    save();
  } catch {
    importFailed = true;
  }
  e.target.value = '';
  render();
  if (importFailed) resultCountEl.textContent = 'That file could not be imported — it is not a Leonida Ledger progress file.';
});

$('reset').addEventListener('click', () => {
  if (window.confirm('Clear all earned trophies? This cannot be undone.')) {
    earned = new Set();
    save();
    render();
  }
});

render();
