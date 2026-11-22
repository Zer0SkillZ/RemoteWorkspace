/* RPG Design Forge — class, item and spell design tool.
 * Plain JavaScript, no build step. Data lives in localStorage and can be
 * exported/imported as JSON or exported as Markdown.
 */
'use strict';

const STORAGE_KEY = 'rpg-forge-data-v1';
const DATA_VERSION = 2;

// Attack attributes are fixed by the game rules.
const CLASS_KINDS = { combat: { label: 'Combat Class', levels: 20 }, noncombat: { label: 'Non-Combat Class', levels: 10 } };
const COST_TYPES = ['Mana', 'UP'];
const OVERVIEW_ID = '__overview__'; // pinned "Magic Overview" entry in the Schools tab

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const clone = (o) => JSON.parse(JSON.stringify(o));
const fmt = (n) => Number(n || 0).toLocaleString();

/* ======================================================================
 * Data model
 * ==================================================================== */

const FRACTURE_TIERS = ['Free', 'Lesser', 'Greater'];
const TRAIT_RARITIES = ['Common', 'Uncommon', 'Rare', 'Legendary'];
const MODULE_CATEGORIES = ['Support Module', 'Weapon Module', 'Advanced Support Module', 'Advanced Weapon Module', 'Core'];

function defaultSettings() {
  return {
    nodeTypes: ['Action', 'Bonus Action', 'Reaction', 'Attack Action', 'Attack Reaction', 'Passive', 'Core Passive',
      'Core Class Mechanic', 'Unique Ability', 'Action Modifier', 'Special Action', 'Spellcasting', 'Capstone'],
    attackNodeTypes: ['Attack Action', 'Attack Reaction'],
    itemActionTypes: ['Attack Action', 'Reaction', 'Special Attack', 'Action', 'Passive'],
    attackTypes: ['Graceful', 'Charm/PSI', 'Might', 'Keen', 'Athose', 'Heft', 'Finesse'],
    damageTypes: ['Slashing', 'Piercing', 'Puncture', 'Bludgeon', 'Impact', 'Bleed', 'Fire', 'Cold', 'Electric', 'Plasma',
      'Force', 'Explosive', 'Psychic', 'Psi', 'Divine', 'Radiant', 'Necrotic', 'True'],
    costs: { classNode: 500, augmentNode: 0, fractureFree: 0, fractureLesser: 250, fractureGreater: 500 },
  };
}

const maxLevel = (kind) => (CLASS_KINDS[kind] || CLASS_KINDS.combat).levels;

function newNode(level) {
  return {
    level, name: '', type: '', flavor: '', cost: '', description: '', grants: '', notes: '',
    isAugment: false, augments: [], isFractured: false, fracturePaths: [],
  };
}
function newVariant(augId, type = '') {
  return { augId, name: '', type, tagline: '', cost: '', appearance: '', description: '', flaw: '', quote: '' };
}
function newClass(kind = 'combat') {
  return {
    id: uid(), name: 'New Class', kind, summary: '', identity: '', notes: '',
    resources: [], proficiencies: { armor: '', weapons: '', tools: '', statFocus: '' },
    augmentations: [],
    nodes: Array.from({ length: maxLevel(kind) }, (_, i) => newNode(i + 1)),
    updated: Date.now(),
  };
}
function newItem() {
  return {
    id: uid(), name: 'New Item', description: '', attackAttribute: 'Might',
    actions: [{ id: uid(), name: '', type: 'Attack Action', description: '' }],
    unique: { name: '', description: '' },
    notes: '', updated: Date.now(),
  };
}
function newSpell() {
  return {
    id: uid(), name: 'New Spell', school: '', description: '', actionDescription: '',
    costType: 'Mana', cost: '', apCost: '', adaptations: [], notes: '', updated: Date.now(),
  };
}
function newSchool() {
  return {
    id: uid(), name: 'New School', description: '', traits: [], spellTypes: '', restrictions: '', whoUses: '',
    figures: [], notes: '', updated: Date.now(),
  };
}
function defaultSchools() {
  return DEFAULT_SCHOOLS.map((d) => Object.assign(newSchool(), {
    name: d.name, description: d.description, spellTypes: d.spellTypes, restrictions: d.restrictions, whoUses: d.whoUses,
    traits: d.traits.map(([name, description]) => ({ id: uid(), name, description })),
    figures: d.figures.map(([name, description]) => ({ id: uid(), name, description })),
  }));
}
function newRule() {
  return { id: uid(), name: 'New Rule', category: '', summary: '', text: '', keywords: '', related: [], notes: '', updated: Date.now() };
}
const newProfile = () => ({ id: uid(), attackType: 'Might', ap: '', damage: '', damageType: '', crit: '', epic: '', range: '', talent: '' });
function newWeapon() {
  return { id: uid(), name: 'New Weapon', group: '', talent: '', description: '', profiles: [newProfile()], notes: '', updated: Date.now() };
}
function newTrait() {
  return { id: uid(), name: 'New Trait', rarity: 'Common', effect: '', notes: '', updated: Date.now() };
}
function newModule() {
  return {
    id: uid(), name: 'New Module', category: 'Weapon Module', complexity: 1, visual: '', cost: '', effect: '',
    execution: '', scaling: '', notes: '', updated: Date.now(),
  };
}
const newFracturePath = () => ({ id: uid(), name: '', description: '', fractures: [] });
const newFracture = (requires = '') => ({ id: uid(), name: '', tier: 'Lesser', cost: '', requires, description: '' });

/** The AOE content generated from the design notes (js/aoe-data.js), as fresh copies. */
function seedContent() {
  const seed = typeof AOE_SEED !== 'undefined' ? clone(AOE_SEED) : {};
  return {
    classes: seed.classes || [], rules: seed.rules || [], weapons: seed.weapons || [],
    traits: seed.traits || [], modules: seed.modules || [],
  };
}

function emptyDb() {
  const seed = seedContent();
  return {
    version: DATA_VERSION, settings: defaultSettings(), classes: seed.classes, items: [], spells: [],
    schools: defaultSchools(), rules: seed.rules, weapons: seed.weapons, traits: seed.traits, modules: seed.modules,
    lore: { magicOverview: Object.assign({}, DEFAULT_MAGIC_OVERVIEW) },
  };
}

/** Small example item + spell (Settings → Add examples). */
function exampleContent() {
  const it = newItem();
  it.name = 'Example: Duelist\'s Needle';
  it.description = 'A slender rapier with a pearl pommel that hums when danger is near.';
  it.attackAttribute = 'Graceful';
  it.actions = [
    { id: uid(), name: 'Thrust', type: 'Attack Action', description: '4 Piercing damage.' },
    { id: uid(), name: 'Riposte', type: 'Reaction', description: 'When a melee attack misses you, make a Thrust against the attacker.' },
  ];
  it.unique = { name: 'Danger Sense', description: 'The wielder cannot be surprised and always acts in the first round of combat.' };
  const sp = newSpell();
  sp.name = 'Example: Searing Bolt';
  sp.school = 'Elementus';
  sp.description = 'A lance of white-hot flame leaps from the caster\'s palm.';
  sp.actionDescription = 'Ranged spell attack, 60ft. On hit: 2d6 fire damage and the target is Burning (1d4 at the start of its turn) for 1 round.';
  sp.cost = '3'; sp.apCost = '2';
  sp.adaptations = [
    { id: uid(), school: 'Vitalis', mechanical: 'Deals necrotic damage instead of fire. The caster may pay 1d6 HP to double the damage.', visual: 'A crimson bolt of the caster\'s own blood, boiling as it flies.' },
    { id: uid(), school: 'Umbrath', mechanical: 'Instead of Burning, roll 1d6 on hit: on a 1 the bolt rebounds on the caster; on a 6 the target is also teleported 15ft in a random direction.', visual: 'A crackling violet tear in reality that snaps shut on the target.' },
  ];
  return { items: [it], spells: [sp] };
}

const SEEDED_COLLECTIONS = ['classes', 'rules', 'weapons', 'traits', 'modules'];

/** Fill in any missing fields so older / hand-edited data still works. */
function normalizeDb(raw) {
  const db = Object.assign(emptyDb(), raw || {});
  db.settings = Object.assign(defaultSettings(), db.settings || {});
  const oldCosts = db.settings.costs || {};
  db.settings.costs = Object.assign(defaultSettings().costs, oldCosts);
  ['firstFracture', 'additionalFracture', 'masterFracture'].forEach((k) => delete db.settings.costs[k]);
  if ('firstFracture' in oldCosts) db.settings.costs.augmentNode = 0; // old default (500) predates "Augmentation nodes cost 0"
  delete db.settings.schools; // schools are their own collection
  if (!raw || !Array.isArray(raw.schools)) db.schools = defaultSchools();
  db.schools = db.schools.map((sc) => {
    const school = Object.assign(newSchool(), sc);
    school.traits = (school.traits || []).map((t) => Object.assign({ id: uid(), name: '', description: '' }, t));
    school.figures = (school.figures || []).map((f) => Object.assign({ id: uid(), name: '', description: '' }, f));
    return school;
  });
  ['weapons', 'traits', 'modules'].forEach((k) => { if (!raw || !Array.isArray(raw[k])) db[k] = seedContent()[k]; });
  db.rules = (db.rules || []).map((r) => {
    const rule = Object.assign(newRule(), r);
    rule.related = Array.isArray(rule.related) ? rule.related : [];
    return rule;
  });
  db.lore = Object.assign({}, db.lore || {});
  db.lore.magicOverview = Object.assign({}, DEFAULT_MAGIC_OVERVIEW, db.lore.magicOverview || {});
  db.classes = (db.classes || []).map(normalizeClass);
  db.items = (db.items || []).map((i) => {
    const it = Object.assign(newItem(), i);
    it.unique = Object.assign({ name: '', description: '' }, it.unique || {});
    it.actions = (it.actions || []).map((a) => Object.assign({ id: uid(), name: '', type: '', description: '' }, a));
    return it;
  });
  db.spells = (db.spells || []).map((s) => {
    const sp = Object.assign(newSpell(), s);
    sp.adaptations = (sp.adaptations || []).map((a) => Object.assign({ id: uid(), school: '', mechanical: '', visual: '' }, a));
    return sp;
  });
  db.weapons = db.weapons.map((w) => {
    const wp = Object.assign(newWeapon(), w);
    wp.profiles = (wp.profiles || []).map((p) => Object.assign(newProfile(), p));
    return wp;
  });
  db.traits = db.traits.map((t) => Object.assign(newTrait(), t));
  db.modules = db.modules.map((m) => Object.assign(newModule(), m));
  return db;
}

function normalizeFractures(p) {
  const fp = Object.assign(newFracturePath(), p);
  fp.fractures = (fp.fractures || []).map((f, i, arr) => {
    const fr = Object.assign(newFracture(), f);
    if (!FRACTURE_TIERS.includes(fr.tier)) fr.tier = 'Lesser';
    if (fr.requires === undefined) fr.requires = i ? arr[i - 1].id : '';
    return fr;
  });
  // Old format: one "master" fracture per path -> a Greater fracture at the end
  if (fp.master) {
    const last = fp.fractures[fp.fractures.length - 1];
    fp.fractures.push(Object.assign(newFracture(last ? last.id : ''), {
      name: fp.master.name, tier: 'Greater', description: fp.master.description,
    }));
  }
  delete fp.master;
  return fp;
}

function normalizeClass(c) {
  const cls = Object.assign(newClass(c.kind || 'combat'), c);
  if (!cls.identity && cls.description) cls.identity = cls.description;
  delete cls.description;
  cls.resources = (cls.resources || []).map((r) => Object.assign({ id: uid(), name: '', description: '' }, r));
  cls.proficiencies = Object.assign({ armor: '', weapons: '', tools: '', statFocus: '' }, cls.proficiencies || {});
  cls.augmentations = (cls.augmentations || []).map((a) => Object.assign({ id: uid(), name: '', philosophy: '' }, a));
  const max = maxLevel(cls.kind);
  const src = c.nodes || [];
  const nodes = [];
  for (let i = 0; i < max; i++) {
    const old = src.find((x) => x && x.level === i + 1) || (src[i] && !src[i].level ? src[i] : {});
    const n = Object.assign(newNode(i + 1), old);
    n.level = i + 1;
    n.augments = (n.augments || []).map((v) => Object.assign(newVariant(''), v));
    n.fracturePaths = (n.fracturePaths || []).map(normalizeFractures);
    nodes.push(n);
  }
  cls.nodes = nodes;
  return cls;
}

/* ======================================================================
 * Storage
 * ==================================================================== */

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeDb(JSON.parse(raw));
  } catch (e) {
    console.error('Failed to load saved data', e);
  }
  return emptyDb();
}

let saveTimer = null;
function save() {
  setStatus('Saving…');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 300);
}
function flushSave() {
  clearTimeout(saveTimer);
  saveTimer = null;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    setStatus('Saved ✓');
  } catch (e) {
    setStatus('⚠ Could not save — export a JSON backup!');
    console.error(e);
  }
}
window.addEventListener('beforeunload', () => { if (saveTimer) flushSave(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && saveTimer) flushSave(); });
function setStatus(t) { document.getElementById('save-status').textContent = t; }

/* ======================================================================
 * State
 * ==================================================================== */

let db = load();
const ui = {
  tab: 'classes',
  selected: { classes: null, items: null, spells: null, schools: OVERVIEW_ID, rules: null, weapons: null, traits: null, modules: null },
  mode: 'edit', // 'edit' | 'preview'
  search: '',
  open: new Set(), // open <details> keys
};

const schoolNames = () => db.schools.map((x) => x.name).filter(Boolean);
const spellsInSchool = (name) => db.spells.filter((sp) => name && sp.school === name);

const joinText = (...parts) => parts.flat(Infinity).filter(Boolean).join(' \n ');

// `fields` feeds the search: [text, weight] pairs, name first.
const COLLECTIONS = {
  classes: {
    label: 'Class', create: () => newClass('combat'), sub: (c) => `${CLASS_KINDS[c.kind].label} · ${maxLevel(c.kind)} levels`,
    fields: (c) => [[c.name, 3], [joinText(c.augmentations.map((a) => a.name), c.nodes.map((n) => n.name)), 2], [c.summary, 2],
      [joinText(c.description, c.notes, c.augmentations.map((a) => a.philosophy), c.nodes.map((n) => [n.type, n.description,
        n.flavor, n.grants, n.augments.map((v) => [v.name, v.tagline, v.appearance, v.description, v.flaw]), n.fracturePaths.map((p) => [p.name, p.description, p.fractures.map((f) => [f.name, f.description])])]), c.identity, c.resources.map((r) => [r.name, r.description])), 1]],
  },
  items: {
    label: 'Item', create: newItem, sub: (i) => `${i.attackAttribute || '—'} · ${i.actions.length} action(s)`,
    fields: (i) => [[i.name, 3], [joinText(i.unique.name, i.attackAttribute, i.actions.map((a) => a.name)), 2],
      [joinText(i.description, i.unique.description, i.actions.map((a) => [a.type, a.description]), i.notes), 1]],
  },
  schools: {
    label: 'School', create: newSchool, sub: (sc) => `${sc.traits.length} trait(s) · ${spellsInSchool(sc.name).length} spell(s)`,
    fields: (sc) => [[sc.name, 3], [joinText(sc.traits.map((t) => t.name), sc.figures.map((f) => f.name)), 2],
      [joinText(sc.description, sc.traits.map((t) => t.description), sc.spellTypes, sc.restrictions, sc.whoUses, sc.figures.map((f) => f.description), sc.notes), 1]],
  },
  spells: {
    label: 'Spell', create: newSpell, sub: (s) => `${s.school || 'No school'} · ${s.cost || '?'} ${s.costType} · ${s.apCost || '?'} AP`,
    fields: (s) => [[s.name, 3], [s.school, 2], [joinText(s.description, s.actionDescription, s.adaptations.map((a) => [a.school, a.mechanical, a.visual]), s.notes), 1]],
  },
  rules: {
    label: 'Rule', create: newRule, sub: (r) => r.summary || r.category || 'No summary',
    group: (r) => r.category || 'Uncategorized',
    groupOrder: () => ['Character Progression', 'Core Rules', 'Combat', 'Conditions', 'Items', 'AG Discretion', 'Glossary', 'Glossary (needs definition)'],
    fields: (r) => [[r.name, 3], [r.keywords, 3], [r.category, 2], [r.summary, 1.5], [joinText(r.text, r.notes), 1]],
  },
};

function current() {
  const list = db[ui.tab];
  if (!list) return null;
  return list.find((e) => e.id === ui.selected[ui.tab]) || null;
}

/** Mark the current entry as changed and persist. */
function touch() {
  const e = current();
  if (e) e.updated = Date.now();
  save();
}

/* ======================================================================
 * DOM helpers
 * ==================================================================== */

function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/**
 * Bound form field. Edits write straight into `obj[key]` and save, without
 * re-rendering (so focus is never lost). `opts.rerender` forces a re-render.
 */
function field(label, obj, key, opts = {}) {
  const { type = 'text', placeholder = '', options, rows = 3, onInput, rerender, cls } = opts;
  let input;
  if (type === 'textarea') {
    input = h('textarea', { rows, placeholder });
    input.value = obj[key] ?? '';
  } else if (type === 'select') {
    input = h('select', {});
    const opt = options || [];
    if (opts.blank !== false) input.append(h('option', { value: '' }, opts.blankLabel || '— choose —'));
    const vals = opt.slice();
    if (obj[key] && !vals.includes(obj[key])) vals.push(obj[key]); // keep legacy values visible
    vals.forEach((o) => input.append(h('option', { value: o }, o)));
    input.value = obj[key] ?? '';
  } else {
    input = h('input', { type, placeholder, list: opts.datalist ? `dl-${key}` : null });
    input.value = obj[key] ?? '';
  }
  const dl = opts.datalist ? h('datalist', { id: `dl-${key}` }, opts.datalist.map((o) => h('option', { value: o }))) : null;
  const evt = type === 'select' ? 'change' : 'input';
  input.addEventListener(evt, () => {
    obj[key] = type === 'number' ? (input.value === '' ? '' : Number(input.value)) : input.value;
    touch();
    if (onInput) onInput(obj[key]);
    if (rerender) render();
  });
  if (!label) return input;
  return h('label', { class: 'field ' + (cls || '') }, h('span', {}, label), input, dl);
}

function checkbox(label, obj, key, onChange, disabledReason) {
  const input = h('input', { type: 'checkbox', disabled: !!disabledReason && !obj[key] });
  input.checked = !!obj[key];
  input.addEventListener('change', () => { obj[key] = input.checked; touch(); if (onChange) onChange(input.checked); render(); });
  return h('label', { class: 'check' + (input.disabled ? ' disabled' : ''), title: input.disabled ? disabledReason : null }, input, label);
}

/* In-page dialogs. Browser alert/confirm/prompt are blocked when the app is
 * hosted inside another page (e.g. a claude.ai artifact), so we draw our own. */
const IN_FRAME = (() => { try { return window.self !== window.top; } catch { return true; } })();

function modal(build) {
  return new Promise((resolve) => {
    const prevFocus = document.activeElement;
    const back = h('div', { class: 'modal-back' });
    const box = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' });
    const close = (v) => { back.remove(); document.removeEventListener('keydown', onKey); if (prevFocus && prevFocus.focus) prevFocus.focus(); resolve(v); };
    const onKey = (ev) => { if (ev.key === 'Escape') close(false); };
    document.addEventListener('keydown', onKey);
    back.addEventListener('click', (ev) => { if (ev.target === back) close(false); });
    build(box, close);
    back.append(box);
    document.body.append(back);
    const focusEl = box.querySelector('[data-autofocus]') || box.querySelector('button');
    if (focusEl) focusEl.focus();
  });
}

/** Ask a yes/no question in the page. Resolves true/false. */
function askConfirm(message, { ok = 'OK', cancel = 'Cancel', danger = false, title = '' } = {}) {
  return modal((box, close) => box.append(
    title ? h('h2', {}, title) : null,
    h('p', { class: 'modal-msg' }, message),
    h('div', { class: 'modal-actions' },
      h('button', { onclick: () => close(false) }, cancel),
      h('button', { class: danger ? 'danger-solid' : 'primary', 'data-autofocus': '', onclick: () => close(true) }, ok))));
}

/** Show a message in the page. */
function notify(message, title = '') {
  return modal((box, close) => box.append(
    title ? h('h2', {}, title) : null,
    h('p', { class: 'modal-msg' }, message),
    h('div', { class: 'modal-actions' }, h('button', { class: 'primary', 'data-autofocus': '', onclick: () => close(true) }, 'OK'))));
}

/** Show text the user can copy (used for exports where downloads are blocked). */
function showText(title, text, hint = '') {
  return modal((box, close) => {
    const ta = h('textarea', { class: 'modal-text', readonly: true, rows: 16 });
    ta.value = text;
    const status = h('span', { class: 'muted' });
    box.classList.add('wide');
    box.append(
      h('h2', {}, title),
      hint ? h('p', { class: 'hint' }, hint) : null,
      ta,
      h('div', { class: 'modal-actions' }, status,
        h('button', { onclick: () => close(true) }, 'Close'),
        h('button', { class: 'primary', 'data-autofocus': '', onclick: async () => {
          try { await navigator.clipboard.writeText(text); status.textContent = 'Copied ✓'; }
          catch { ta.focus(); ta.select(); status.textContent = 'Press Ctrl+C (⌘C) to copy the selected text.'; }
        } }, 'Copy all')));
  });
}

function moveInArray(arr, idx, dir) {
  const j = idx + dir;
  if (j < 0 || j >= arr.length) return;
  [arr[idx], arr[j]] = [arr[j], arr[idx]];
}

/** Collapsible block that remembers its open state between re-renders. */
function collapsible(key, summaryChildren, bodyFn, cls = 'node') {
  const d = h('details', { class: cls });
  if (ui.open.has(key)) d.open = true;
  d.addEventListener('toggle', () => {
    if (d.open) {
      ui.open.add(key);
      if (!d.dataset.built) { d.append(h('div', { class: 'node-body' }, bodyFn())); d.dataset.built = '1'; }
    } else ui.open.delete(key);
  });
  d.append(h('summary', {}, summaryChildren));
  if (d.open) { d.append(h('div', { class: 'node-body' }, bodyFn())); d.dataset.built = '1'; }
  return d;
}

/* ======================================================================
 * Rendering — shell
 * ==================================================================== */

function render() {
  const editorEl = document.getElementById('editor');
  const scroll = editorEl.scrollTop;
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === ui.tab));
  document.getElementById('app').classList.toggle('full', ui.tab === 'settings');
  renderSidebar();
  editorEl.replaceChildren(renderEditor());
  editorEl.scrollTop = scroll;
}

function renderSidebar() {
  const side = document.getElementById('sidebar');
  if (ui.tab === 'settings') { side.replaceChildren(); return; }
  const coll = COLLECTIONS[ui.tab];
  const search = h('input', { type: 'search', id: 'side-search', placeholder: ui.tab === 'rules' ? 'Search rules (typos and close wording OK)…' : `Search ${ui.tab}…` });
  search.value = ui.search;
  search.addEventListener('input', () => { ui.search = search.value; renderList(); });
  search.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && ui.search.trim() && ui.firstResult) { ui.selected[ui.tab] = ui.firstResult.id; render(); }
    if (ev.key === 'Escape') { ui.search = ''; search.value = ''; renderList(); }
  });

  const actions = h('div', { class: 'side-actions' });
  if (ui.tab === 'classes') {
    actions.append(
      h('button', { class: 'primary', onclick: () => addEntry(newClass('combat')) }, '+ Combat Class'),
      h('button', { onclick: () => addEntry(newClass('noncombat')) }, '+ Non-Combat'),
    );
  } else {
    actions.append(h('button', { class: 'primary', onclick: () => addEntry(coll.create()) }, `+ New ${coll.label}`));
  }
  const list = h('ul', { class: 'entry-list', id: 'entry-list' });
  side.replaceChildren(actions, search, list);
  renderList();
}

function renderList() {
  const list = document.getElementById('entry-list');
  if (!list) return;
  const coll = COLLECTIONS[ui.tab];
  const q = ui.search.trim();
  const byName = (a, b) => (a.name || '').localeCompare(b.name || '');
  const item = (e) => h('li', {
    class: e.id === ui.selected[ui.tab] ? 'selected' : '',
    onclick: () => { ui.selected[ui.tab] = e.id; render(); },
  }, h('div', { class: 'entry-name' }, e.name || '(unnamed)'),
  h('div', { class: 'entry-sub' }, q && ui.tab === 'rules' ? snippet(joinText(e.summary, e.text), q) : coll.sub(e)));
  const heading = (t) => h('li', { class: 'list-heading' }, t);

  const rows = [];
  let found = 0;
  if (!q) {
    const sorted = db[ui.tab].slice().sort(byName);
    found = sorted.length;
    if (coll.group) {
      const groups = {};
      sorted.forEach((e) => (groups[coll.group(e)] = groups[coll.group(e)] || []).push(e));
      const order = coll.groupOrder ? coll.groupOrder() : [];
      const rank = (g) => (order.includes(g) ? order.indexOf(g) : order.length);
      Object.keys(groups).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)).forEach((g) => rows.push(heading(g), ...groups[g].map(item)));
    } else rows.push(...sorted.map(item));
  } else {
    const r = searchEntries(db[ui.tab], q, coll.fields);
    found = r.matches.length + r.similar.length;
    ui.firstResult = (r.matches[0] || r.similar[0] || {}).entry || null;
    if (r.matches.length) rows.push(heading(`Matches (${r.matches.length})`), ...r.matches.map((x) => item(x.entry)));
    if (r.similar.length) rows.push(heading(r.matches.length ? 'Similar' : 'No exact match: closest results'), ...r.similar.map((x) => item(x.entry)));
  }
  const pinned = [];
  if (ui.tab === 'schools' && !q) {
    pinned.push(h('li', {
      class: ui.selected.schools === OVERVIEW_ID ? 'selected' : '',
      onclick: () => { ui.selected.schools = OVERVIEW_ID; render(); },
    }, h('div', { class: 'entry-name' }, `📜 ${db.lore.magicOverview.title || 'Magic Overview'}`), h('div', { class: 'entry-sub' }, 'Magic system overview')));
  }
  list.replaceChildren(...pinned, ...rows);
  if (!found) list.append(h('li', { class: 'muted' }, q ? 'Nothing similar found. Try other words.' : 'Nothing here yet.'));
}

function addEntry(entry) {
  db[ui.tab].push(entry);
  ui.selected[ui.tab] = entry.id;
  ui.mode = 'edit';
  save();
  render();
}

function renderEditor() {
  if (ui.tab === 'settings') return renderSettings();
  if (ui.tab === 'schools' && ui.selected.schools === OVERVIEW_ID) return renderOverviewEditor();
  const e = current();
  const coll = COLLECTIONS[ui.tab];
  if (!e) {
    return h('div', { class: 'empty-state' },
      h('h2', {}, `No ${coll.label.toLowerCase()} selected`),
      h('p', {}, `Pick one from the list, or create a new ${coll.label.toLowerCase()}.`));
  }
  const head = h('div', { class: 'editor-head' },
    h('h1', {}, e.name || '(unnamed)'),
    h('button', { class: ui.mode === 'edit' ? 'active' : '', onclick: () => { ui.mode = 'edit'; render(); } }, '✎ Edit'),
    h('button', { class: ui.mode === 'preview' ? 'active' : '', onclick: () => { ui.mode = 'preview'; render(); } }, '👁 Preview'),
    h('button', { onclick: () => copyText(toMarkdown(ui.tab, e)), title: 'Copy as Markdown' }, '⧉ Copy'),
    h('button', { onclick: () => download(`${slug(e.name)}.md`, toMarkdown(ui.tab, e), 'text/markdown'), title: 'Download as Markdown' }, '⇩ .md'),
    h('button', { onclick: () => duplicateEntry(e) }, 'Duplicate'),
    h('button', { class: 'danger', onclick: () => deleteEntry(e) }, 'Delete'),
  );
  let body;
  if (ui.mode === 'preview') body = h('div', { class: 'preview', html: mdToHtml(toMarkdown(ui.tab, e)) });
  else if (ui.tab === 'classes') body = renderClassEditor(e);
  else if (ui.tab === 'items') body = renderItemEditor(e);
  else if (ui.tab === 'schools') body = renderSchoolEditor(e);
  else if (ui.tab === 'rules') body = renderRuleEditor(e);
  else if (SCHEMAS[ui.tab]) body = renderSchemaEditor(e, SCHEMAS[ui.tab]);
  else body = renderSpellEditor(e);
  return h('div', {}, head, body);
}

function duplicateEntry(e) {
  const copy = clone(e);
  copy.id = uid();
  copy.name = `${e.name} (copy)`;
  addEntry(ui.tab === 'classes' ? normalizeClass(copy) : copy);
}
async function deleteEntry(e) {
  const used = ui.tab === 'schools' ? spellsInSchool(e.name).length : 0;
  const extra = used ? `\n\n${used} spell(s) use this school and will be left with an unknown school.` : '';
  if (!await askConfirm(`Delete "${e.name}"? This cannot be undone (unless you have a JSON backup).${extra}`, { ok: 'Delete', danger: true })) return;
  db[ui.tab] = db[ui.tab].filter((x) => x.id !== e.id);
  if (ui.tab === 'rules') db.rules.forEach((r) => { r.related = r.related.filter((id) => id !== e.id); });
  ui.selected[ui.tab] = null;
  save();
  render();
}

/* ======================================================================
 * Class editor
 * ==================================================================== */

function nodeTypesFor(kind) {
  const s = db.settings;
  return kind === 'noncombat' ? s.nodeTypes.filter((t) => !s.attackNodeTypes.includes(t)) : s.nodeTypes.slice();
}

async function changeClassKind(c, kind) {
  const newMax = maxLevel(kind);
  const lost = c.nodes.slice(newMax).filter((n) => n.name || n.description || n.isFractured || n.isAugment);
  if (lost.length && !await askConfirm(`Switching to ${CLASS_KINDS[kind].label} keeps only ${newMax} levels. ${lost.length} filled-in node(s) above level ${newMax} will be removed.`, { ok: 'Switch and remove', danger: true })) {
    render();
    return;
  }
  c.kind = kind;
  c.nodes = normalizeClass(c).nodes;
  touch();
  render();
}

const tierCost = (tier) => Number(db.settings.costs['fracture' + tier] ?? 0);
const pathCost = (p) => p.fractures.reduce((sum, f) => sum + tierCost(f.tier), 0);

/** Depth of a fracture inside its path tree (0 = starts the path). */
function fractureDepth(p, f, seen = new Set()) {
  if (!f.requires || seen.has(f.id)) return 0;
  seen.add(f.id);
  const parent = p.fractures.find((x) => x.id === f.requires);
  return parent ? 1 + fractureDepth(p, parent, seen) : 0;
}

function classCosts(c) {
  const s = db.settings.costs;
  const nodes = c.nodes.slice(0, maxLevel(c.kind));
  const out = {
    levels: nodes.length, base: nodes.length * s.classNode,
    augNodes: nodes.filter((n) => n.isAugment).length,
    fracturedNodes: nodes.filter((n) => n.isFractured).length,
    paths: 0, fractures: 0, greater: 0, fractureTotal: 0,
  };
  nodes.forEach((n) => {
    if (!n.isFractured) return;
    n.fracturePaths.forEach((p) => {
      out.paths++;
      out.fractures += p.fractures.length;
      out.greater += p.fractures.filter((f) => f.tier === 'Greater').length;
      out.fractureTotal += pathCost(p);
    });
  });
  out.augTotal = out.augNodes * s.augmentNode;
  return out;
}

function titleUpdater(obj) {
  return () => { renderList(); const t = document.querySelector('.editor-head h1'); if (t) t.textContent = obj.name || '(unnamed)'; };
}

function renderClassEditor(c) {
  const wrap = h('div', {});

  // --- Basics
  const kindSel = h('select', {}, Object.entries(CLASS_KINDS).map(([k, v]) => h('option', { value: k }, `${v.label} (${v.levels} levels)`)));
  kindSel.value = c.kind;
  kindSel.addEventListener('change', () => changeClassKind(c, kindSel.value));
  wrap.append(h('div', { class: 'section' },
    h('h2', {}, 'Class Basics'),
    h('div', { class: 'row' },
      field('Class name', c, 'name', { onInput: titleUpdater(c) }),
      h('label', { class: 'field' }, h('span', {}, 'Class type'), kindSel)),
    field('Summary (one line)', c, 'summary', { placeholder: 'A short pitch for the class' }),
    field('Class Identity', c, 'identity', { type: 'textarea', rows: 5 }),
  ));

  // --- Resources & proficiencies
  wrap.append(namedList('Base Resources', 'AP, RP, BP and any class resource (Combo, Chakra, Overdrive…).', c.resources, ['Resource', 'Description'], '', 2));
  wrap.append(h('div', { class: 'section' },
    h('h2', {}, 'Recommended Proficiencies'),
    h('p', { class: 'hint' }, 'Granted on first class.'),
    h('div', { class: 'row' },
      field('Armor', c.proficiencies, 'armor'),
      field('Weapons', c.proficiencies, 'weapons')),
    h('div', { class: 'row' },
      field('Tool Mastery', c.proficiencies, 'tools'),
      field('Stat Focus', c.proficiencies, 'statFocus'))));

  // --- Augmentations
  const augSec = h('div', { class: 'section' },
    h('h2', {}, 'Augmentation Paths', h('span', { class: 'spacer' }),
      h('button', { class: 'small', onclick: () => { c.augmentations.push({ id: uid(), name: '', philosophy: '' }); touch(); render(); } }, '+ Add Augmentation Path')),
    h('p', { class: 'hint' }, 'Philosophical approaches to the class (traditions, sins, graft-gods…). Paths are exclusive; augmenting is optional per node and costs 0. The AG may allow switching.'));
  if (!c.augmentations.length) augSec.append(h('p', { class: 'muted' }, 'No augmentation paths yet.'));
  c.augmentations.forEach((a, i) => {
    augSec.append(h('div', { class: 'subcard aug' },
      h('div', { class: 'subcard-head' }, h('strong', {}, a.name || `Augmentation Path ${i + 1}`),
        h('button', { class: 'small', onclick: () => { moveInArray(c.augmentations, i, -1); touch(); render(); } }, '↑'),
        h('button', { class: 'small', onclick: () => { moveInArray(c.augmentations, i, 1); touch(); render(); } }, '↓'),
        h('button', { class: 'small danger', onclick: () => removeAugmentation(c, a) }, 'Remove')),
      field('Name', a, 'name', { onInput: () => refreshNodeSummaries() }),
      field('Philosophy, restrictions & specialties', a, 'philosophy', { type: 'textarea', rows: 4 })));
  });
  wrap.append(augSec);

  // --- Ascension costs
  wrap.append(renderCostSection(c));

  // --- Nodes
  const nodesSec = h('div', { class: 'section' },
    h('h2', {}, `Core Nodes (Levels 1–${maxLevel(c.kind)})`, h('span', { class: 'spacer' }),
      h('button', { class: 'small', onclick: () => { c.nodes.forEach((n) => ui.open.add(nodeKey(c, n))); render(); } }, 'Expand all'),
      h('button', { class: 'small', onclick: () => { c.nodes.forEach((n) => ui.open.delete(nodeKey(c, n))); render(); } }, 'Collapse all')),
    c.kind === 'noncombat' ? h('p', { class: 'hint' }, 'Non-combat class: attack node types are hidden.') : null);
  c.nodes.slice(0, maxLevel(c.kind)).forEach((n) => nodesSec.append(renderNode(c, n)));
  wrap.append(nodesSec);

  wrap.append(h('div', { class: 'section' }, h('h2', {}, 'Designer Notes'),
    field('', c, 'notes', { type: 'textarea', rows: 4, placeholder: 'Balance notes, ideas, TODOs… (included in exports)' })));
  return wrap;
}

async function removeAugmentation(c, a) {
  if (!await askConfirm(`Remove augmentation path "${a.name || 'unnamed'}"? Its variants on every node are removed too.`, { ok: 'Remove', danger: true })) return;
  c.augmentations = c.augmentations.filter((x) => x.id !== a.id);
  c.nodes.forEach((n) => { n.augments = n.augments.filter((v) => v.augId !== a.id); });
  touch();
  render();
}

function renderCostSection(c) {
  const k = classCosts(c);
  const s = db.settings.costs;
  const tile = (v, l) => h('div', { class: 'cost-tile' }, h('div', { class: 'v' }, v), h('div', { class: 'l' }, l));
  return h('div', { class: 'section', id: 'cost-section' },
    h('h2', {}, 'Ascension Points'),
    h('p', { class: 'hint' }, `Core node ${fmt(s.classNode)} · Augmentation node ${fmt(s.augmentNode)} · Fractures: Free ${fmt(s.fractureFree)}, Lesser ${fmt(s.fractureLesser)}, Greater ${fmt(s.fractureGreater)} (editable in Settings).`),
    h('div', { class: 'cost-grid' },
      tile(fmt(k.base), `All ${k.levels} core nodes`),
      tile(k.augNodes, 'Augmentation nodes'),
      tile(k.fracturedNodes, 'Fractured nodes'),
      tile(`${k.paths} / ${k.fractures} / ${k.greater}`, 'Paths / fractures / greater'),
      tile(fmt(k.fractureTotal), 'Every fracture combined'),
      tile(fmt(k.base + k.augTotal + k.fractureTotal), 'Everything in this class')));
}

const nodeKey = (c, n) => `${c.id}:node:${n.level}`;

function nodeSummary(c, n) {
  const types = nodeTypesFor(c.kind);
  const bits = [
    h('span', { class: 'lvl' }, `Lv ${n.level}`),
    h('span', { class: 'node-title' + (n.name ? '' : ' empty') }, n.name || 'Unnamed node'),
  ];
  if (n.type) bits.push(h('span', { class: 'badge type' }, n.type));
  if (n.type && !types.includes(n.type)) bits.push(h('span', { class: 'badge warn', title: 'This type is not in the node type list for this class type' }, '⚠ type'));
  if (n.cost) bits.push(h('span', { class: 'badge' }, n.cost.length > 34 ? n.cost.slice(0, 32) + '…' : n.cost));
  if (n.isAugment) bits.push(h('span', { class: 'badge aug' }, `Augment ×${n.augments.filter((v) => c.augmentations.some((a) => a.id === v.augId) && (v.name || v.description)).length}`));
  if (n.isFractured) bits.push(h('span', { class: 'badge frac' }, `Fractured · ${n.fracturePaths.length} path(s)`));
  if (n.isAugment && n.isFractured) bits.push(h('span', { class: 'badge warn' }, '⚠ augment + fractured'));
  if (n.notes) bits.push(h('span', { class: 'badge note', title: n.notes }, '✎ note'));
  if (!n.name && !n.description) bits.push(h('span', { class: 'badge' }, 'empty'));
  return bits;
}

/** Update node summary lines + cost tiles without rebuilding open forms. */
function refreshNodeSummaries() {
  const c = current();
  if (!c || ui.tab !== 'classes') return;
  c.nodes.forEach((n) => {
    const sum = document.querySelector(`details[data-key="${nodeKey(c, n)}"] > summary`);
    if (sum) sum.replaceChildren(...nodeSummary(c, n));
  });
  const cost = document.getElementById('cost-section');
  if (cost) cost.replaceWith(renderCostSection(c));
}

function renderNode(c, n) {
  const d = collapsible(nodeKey(c, n), nodeSummary(c, n), () => renderNodeBody(c, n));
  d.dataset.key = nodeKey(c, n);
  return d;
}

function renderNodeBody(c, n) {
  const types = nodeTypesFor(c.kind);
  const body = h('div', {});
  body.append(
    h('div', { class: 'row' },
      field('Node name', n, 'name', { onInput: refreshNodeSummaries }),
      field('Node type', n, 'type', { type: 'select', options: types, onInput: refreshNodeSummaries })),
    h('div', { class: 'row' },
      field('Flavor line', n, 'flavor', { placeholder: 'e.g. Pride does not retreat.' }),
      field('Cost / frequency', n, 'cost', { placeholder: 'e.g. 1 AP | 1 BP | Cooldown 3 Rounds', onInput: refreshNodeSummaries })),
    field('Mechanics', n, 'description', { type: 'textarea', rows: 6 }),
    field('Grants ("In addition…": resource caps, spells, mana)', n, 'grants', { type: 'textarea', rows: 2 }),
    field('Node notes (designer only)', n, 'notes', { type: 'textarea', rows: 2, onInput: refreshNodeSummaries }),
    h('div', {},
      checkbox('Augmentation node', n, 'isAugment', null, n.isFractured ? 'A node cannot be both — this is already a Fractured node.' : null),
      checkbox('Fractured node', n, 'isFractured', (on) => { if (on && !n.fracturePaths.length) n.fracturePaths.push(newFracturePath()); },
        n.isAugment ? 'A node cannot be both — this is already an Augmentation node.' : null),
      h('span', { class: 'muted' }, 'A node can be an Augmentation node or a Fractured node, not both.')),
  );
  if (n.isAugment && n.isFractured) {
    body.append(h('p', { class: 'badge warn' }, '⚠ This node is marked as both Augmentation and Fractured — untick one.'));
  }

  // Augmentation variants
  if (n.isAugment) {
    if (!c.augmentations.length) {
      body.append(h('p', { class: 'hint' }, 'This class has no Augmentation Paths yet — add one above to write its variant here.'));
    }
    c.augmentations.forEach((a) => {
      let v = n.augments.find((x) => x.augId === a.id);
      if (!v) { v = newVariant(a.id, n.type); n.augments.push(v); }
      body.append(h('details', { class: 'subcard aug variant', open: !!(v.name || v.description) && n.augments.length <= 2 },
        h('summary', {}, h('strong', {}, `${a.name || 'Unnamed path'}`), v.name ? ` — ${v.name}` : h('span', { class: 'muted' }, ' — not written yet'),
          h('span', { class: 'badge cost' }, `${fmt(db.settings.costs.augmentNode)} Asc`)),
        h('div', { class: 'row' },
          field('Variant name', v, 'name'),
          field('Variant type', v, 'type', { type: 'select', options: types })),
        h('div', { class: 'row' },
          field('Tagline', v, 'tagline', { placeholder: 'e.g. The warrior who demands blood.' }),
          field('Cost / frequency', v, 'cost')),
        field('Appearance / transformation', v, 'appearance', { type: 'textarea', rows: 2 }),
        field('Mechanics', v, 'description', { type: 'textarea', rows: 5 }),
        h('div', { class: 'row' },
          field('Flaw', v, 'flaw', { type: 'textarea', rows: 2 }),
          field('Closing quote', v, 'quote', { type: 'textarea', rows: 2 }))));
    });
  }

  // Fracture paths
  if (n.isFractured) {
    body.append(h('p', { class: 'hint', style: 'margin-top:8px' },
      'The first node of a path is Free; nodes attached to it are Lesser; Greater fractures are deep commitments. Use "Builds on" to branch (e.g. three shield disciplines all building on Stand the Line).'));
    n.fracturePaths.forEach((p, pi) => body.append(renderFracturePath(c, n, p, pi)));
    body.append(h('button', { class: 'small', onclick: () => { n.fracturePaths.push(newFracturePath()); touch(); render(); } }, '+ Add fracture path'));
  }
  return body;
}

function renderFracturePath(c, n, p, pi) {
  const card = h('div', { class: 'subcard frac' },
    h('div', { class: 'subcard-head' },
      h('strong', {}, `Fracture Path ${pi + 1}${p.name ? ': ' + p.name : ''}`),
      h('span', { class: 'badge cost' }, `Path total ${fmt(pathCost(p))} Asc`),
      h('button', { class: 'small', title: 'Move up', onclick: () => { moveInArray(n.fracturePaths, pi, -1); touch(); render(); } }, '↑'),
      h('button', { class: 'small', title: 'Move down', onclick: () => { moveInArray(n.fracturePaths, pi, 1); touch(); render(); } }, '↓'),
      h('button', { class: 'small danger', onclick: async () => { if (await askConfirm('Remove this fracture path and all its fractures?', { ok: 'Remove', danger: true })) { n.fracturePaths.splice(pi, 1); touch(); render(); } } }, 'Remove path')),
    h('div', { class: 'row' }, field('Path name', p, 'name', { placeholder: 'e.g. Shield' }), field('Path theme', p, 'description', { placeholder: 'How this path modifies the node' })));

  p.fractures.forEach((f, fi) => {
    const depth = fractureDepth(p, f);
    const parents = p.fractures.filter((x) => x.id !== f.id);
    const reqSel = h('select', {}, h('option', { value: '' }, '— starts the path —'),
      parents.map((x) => h('option', { value: x.id }, x.name || `Fracture ${p.fractures.indexOf(x) + 1}`)));
    reqSel.value = f.requires || '';
    reqSel.addEventListener('change', () => { f.requires = reqSel.value; touch(); render(); });
    card.append(h('div', { class: `subcard tier-${f.tier.toLowerCase()}`, style: `margin-left:${Math.min(depth, 4) * 22}px` },
      h('div', { class: 'subcard-head' },
        h('strong', {}, `${depth ? '↳ '.repeat(1) : ''}${f.name || `Fracture ${fi + 1}`}`),
        h('span', { class: `badge tier tier-${f.tier.toLowerCase()}` }, `${f.tier} · ${fmt(tierCost(f.tier))} Asc`),
        h('button', { class: 'small', onclick: () => { moveInArray(p.fractures, fi, -1); touch(); render(); } }, '↑'),
        h('button', { class: 'small', onclick: () => { moveInArray(p.fractures, fi, 1); touch(); render(); } }, '↓'),
        h('button', { class: 'small danger', onclick: () => removeFracture(p, f) }, 'Remove')),
      h('div', { class: 'row' },
        field('Fracture name', f, 'name'),
        field('Tier', f, 'tier', { type: 'select', options: FRACTURE_TIERS, blank: false, rerender: true }),
        h('label', { class: 'field' }, h('span', {}, 'Builds on'), reqSel)),
      field('Cost / frequency', f, 'cost', { placeholder: 'e.g. 1 RP | Cooldown 2 Rounds' }),
      field('What it adds / changes', f, 'description', { type: 'textarea', rows: 3 })));
  });
  const last = p.fractures[p.fractures.length - 1];
  card.append(h('div', { class: 'row' },
    h('button', { class: 'small', onclick: () => { const f = newFracture(last ? last.id : ''); if (!last) f.tier = 'Free'; p.fractures.push(f); touch(); render(); } }, '+ Add fracture')));
  return card;
}

function removeFracture(p, f) {
  p.fractures.forEach((x) => { if (x.requires === f.id) x.requires = f.requires; });
  p.fractures.splice(p.fractures.indexOf(f), 1);
  touch();
  render();
}

/* ======================================================================
 * Item editor
 * ==================================================================== */

function renderItemEditor(it) {
  const s = db.settings;
  const wrap = h('div', {});
  wrap.append(h('div', { class: 'section' },
    h('h2', {}, 'Item Basics'),
    h('div', { class: 'row' },
      field('Item name', it, 'name', { onInput: () => { renderList(); document.querySelector('.editor-head h1').textContent = it.name || '(unnamed)'; } }),
      field('Attack type', it, 'attackAttribute', { type: 'select', options: db.settings.attackTypes, blank: false, onInput: renderList })),
    field('Description', it, 'description', { type: 'textarea', rows: 3 })));

  const actSec = h('div', { class: 'section' },
    h('h2', {}, 'Actions', h('span', { class: 'spacer' }),
      h('button', { class: 'small', onclick: () => { it.actions.push({ id: uid(), name: '', type: s.itemActionTypes[0] || '', description: '' }); touch(); render(); } }, '+ Add Action')),
    h('p', { class: 'hint' }, 'Items have one or more actions — attack actions, reactions, special attacks, etc.'));
  if (!it.actions.length) actSec.append(h('p', { class: 'badge warn' }, '⚠ Items should have at least one action.'));
  it.actions.forEach((a, i) => {
    actSec.append(h('div', { class: 'subcard' },
      h('div', { class: 'subcard-head' }, h('strong', {}, `Action ${i + 1}`),
        h('button', { class: 'small', onclick: () => { moveInArray(it.actions, i, -1); touch(); render(); } }, '↑'),
        h('button', { class: 'small', onclick: () => { moveInArray(it.actions, i, 1); touch(); render(); } }, '↓'),
        h('button', { class: 'small danger', onclick: () => { it.actions.splice(i, 1); touch(); render(); } }, 'Remove')),
      h('div', { class: 'row' }, field('Action name', a, 'name'), field('Action type', a, 'type', { type: 'select', options: s.itemActionTypes })),
      field('Mechanics (damage, range, effects)', a, 'description', { type: 'textarea', rows: 2 })));
  });
  wrap.append(actSec);

  wrap.append(h('div', { class: 'section' },
    h('h2', {}, 'Unique Attribute'),
    h('p', { class: 'hint' }, 'What makes this item special beyond its damage numbers.'),
    field('Name', it.unique, 'name'),
    field('Effect', it.unique, 'description', { type: 'textarea', rows: 3 })));

  wrap.append(h('div', { class: 'section' }, h('h2', {}, 'Designer Notes'),
    field('', it, 'notes', { type: 'textarea', rows: 3 })));
  return wrap;
}

/* ======================================================================
 * Spell editor
 * ==================================================================== */

function renderSpellEditor(sp) {
  const s = db.settings;
  const wrap = h('div', {});
  wrap.append(h('div', { class: 'section' },
    h('h2', {}, 'Spell Basics'),
    h('div', { class: 'row' },
      field('Spell name', sp, 'name', { onInput: () => { renderList(); document.querySelector('.editor-head h1').textContent = sp.name || '(unnamed)'; } }),
      field('School of magic', sp, 'school', { type: 'select', options: schoolNames(), rerender: true })),
    h('div', { class: 'row' },
      field('Cost type', sp, 'costType', { type: 'select', options: COST_TYPES, blank: false, onInput: renderList }),
      field('Mana / UP cost', sp, 'cost', { placeholder: 'e.g. 3', onInput: renderList }),
      field('AP cost', sp, 'apCost', { placeholder: 'e.g. 2', onInput: renderList })),
    field('Description (flavor / visual)', sp, 'description', { type: 'textarea', rows: 3 }),
    field('Action description (mechanics: damage, effects, range…)', sp, 'actionDescription', { type: 'textarea', rows: 4 })));

  const adSec = h('div', { class: 'section' },
    h('h2', {}, 'School Adaptations', h('span', { class: 'spacer' }),
      h('button', { class: 'small', onclick: () => { sp.adaptations.push({ id: uid(), school: '', mechanical: '', visual: '' }); touch(); render(); } }, '+ Add Adaptation')),
    h('p', { class: 'hint' }, 'How a caster from another school performs this spell — mechanical and visual changes.'));
  if (!sp.adaptations.length) adSec.append(h('p', { class: 'muted' }, 'No adaptations yet.'));
  sp.adaptations.forEach((a, i) => {
    const dup = a.school && sp.adaptations.filter((x) => x.school === a.school).length > 1;
    adSec.append(h('div', { class: 'subcard aug' },
      h('div', { class: 'subcard-head' }, h('strong', {}, `${a.school || 'Choose a school'} adaptation`),
        a.school && a.school === sp.school ? h('span', { class: 'badge warn' }, 'Same as spell\'s own school') : null,
        dup ? h('span', { class: 'badge warn' }, 'Duplicate school') : null,
        h('button', { class: 'small danger', onclick: () => { sp.adaptations.splice(i, 1); touch(); render(); } }, 'Remove')),
      field('School', a, 'school', { type: 'select', options: schoolNames().filter((x) => x !== sp.school), rerender: true }),
      field('Mechanical changes', a, 'mechanical', { type: 'textarea', rows: 2 }),
      field('Visual changes', a, 'visual', { type: 'textarea', rows: 2 })));
  });
  wrap.append(adSec);

  wrap.append(h('div', { class: 'section' }, h('h2', {}, 'Designer Notes'),
    field('', sp, 'notes', { type: 'textarea', rows: 3 })));
  return wrap;
}

/* ======================================================================
 * Schools of magic
 * ==================================================================== */

function renderOverviewEditor() {
  const ov = db.lore.magicOverview;
  const head = h('div', { class: 'editor-head' },
    h('h1', {}, ov.title || 'Magic Overview'),
    h('button', { class: ui.mode === 'edit' ? 'active' : '', onclick: () => { ui.mode = 'edit'; render(); } }, '✎ Edit'),
    h('button', { class: ui.mode === 'preview' ? 'active' : '', onclick: () => { ui.mode = 'preview'; render(); } }, '👁 Preview'));
  const md = () => `# ${ov.title}\n\n${para(ov.text)}\n## Schools\n\n${db.schools.map((sc) => `- **${sc.name}** — ${(sc.description || '').trim()}`).join('\n')}`;
  if (ui.mode === 'preview') return h('div', {}, head, h('div', { class: 'preview', html: mdToHtml(md()) }));
  return h('div', {}, head, h('div', { class: 'section' },
    h('h2', {}, 'Magic System Overview'),
    h('p', { class: 'hint' }, 'The introduction to your magic system. Included at the top of the full Markdown export.'),
    field('Title', ov, 'title', { onInput: () => { renderList(); document.querySelector('.editor-head h1').textContent = ov.title; } }),
    field('Overview', ov, 'text', { type: 'textarea', rows: 8 })));
}

/** Editable list of {name, description} entries (traits, notable figures…). */
function namedList(title, hint, arr, labels, cls = '', rows = 3) {
  const sec = h('div', { class: 'section' },
    h('h2', {}, title, h('span', { class: 'spacer' }),
      h('button', { class: 'small', onclick: () => { arr.push({ id: uid(), name: '', description: '' }); touch(); render(); } }, `+ Add`)),
    hint ? h('p', { class: 'hint' }, hint) : null);
  if (!arr.length) sec.append(h('p', { class: 'muted' }, 'None yet.'));
  arr.forEach((t, i) => sec.append(h('div', { class: 'subcard ' + cls },
    h('div', { class: 'subcard-head' }, h('strong', {}, t.name || `${labels[0]} ${i + 1}`),
      h('button', { class: 'small', onclick: () => { moveInArray(arr, i, -1); touch(); render(); } }, '↑'),
      h('button', { class: 'small', onclick: () => { moveInArray(arr, i, 1); touch(); render(); } }, '↓'),
      h('button', { class: 'small danger', onclick: () => { arr.splice(i, 1); touch(); render(); } }, 'Remove')),
    field(labels[0], t, 'name'),
    field(labels[1], t, 'description', { type: 'textarea', rows }))));
  return sec;
}

function renderSchoolEditor(sc) {
  const wrap = h('div', {});
  let prevName = sc.name;
  wrap.append(h('div', { class: 'section' },
    h('h2', {}, 'School Basics'),
    field('School name', sc, 'name', {
      onInput: (name) => {
        // Keep spells pointing at this school when it is renamed.
        db.spells.forEach((sp) => {
          if (prevName && sp.school === prevName) sp.school = name;
          sp.adaptations.forEach((a) => { if (prevName && a.school === prevName) a.school = name; });
        });
        prevName = name;
        renderList();
        document.querySelector('.editor-head h1').textContent = name || '(unnamed)';
      },
    }),
    field('Description', sc, 'description', { type: 'textarea', rows: 3 })));
  wrap.append(namedList('Traits', 'The defining features of this school (e.g. Conduit Dependency, Fluid Casting).', sc.traits, ['Trait', 'Description'], 'aug'));
  wrap.append(h('div', { class: 'section' },
    h('h2', {}, 'Casting Profile'),
    field('Types of spells', sc, 'spellTypes', { type: 'textarea', rows: 3 }),
    field('Possible restrictions', sc, 'restrictions', { type: 'textarea', rows: 3 }),
    field('Who would use this magic', sc, 'whoUses', { type: 'textarea', rows: 4 })));
  wrap.append(namedList('Notable Figures', 'Legendary practitioners, founders, and their signature spells.', sc.figures, ['Name', 'Story'], 'master'));

  const spells = spellsInSchool(sc.name);
  const adapted = db.spells.filter((sp) => sp.adaptations.some((a) => a.school === sc.name));
  const link = (sp) => h('li', {}, h('a', { href: '#', onclick: (ev) => { ev.preventDefault(); ui.tab = 'spells'; ui.selected.spells = sp.id; ui.mode = 'edit'; render(); } }, sp.name || '(unnamed)'));
  wrap.append(h('div', { class: 'section' },
    h('h2', {}, 'Spells'),
    h('p', { class: 'hint' }, 'Spells from the Spells tab that belong to, or have an adaptation for, this school.'),
    h('strong', {}, `Native spells (${spells.length})`),
    spells.length ? h('ul', {}, spells.map(link)) : h('p', { class: 'muted' }, 'None yet.'),
    h('strong', {}, `Adapted from other schools (${adapted.length})`),
    adapted.length ? h('ul', {}, adapted.map(link)) : h('p', { class: 'muted' }, 'None yet.')));

  wrap.append(h('div', { class: 'section' }, h('h2', {}, 'Designer Notes'),
    field('', sc, 'notes', { type: 'textarea', rows: 3 })));
  return wrap;
}

function schoolToMd(sc) {
  const out = [`# ${sc.name}`, ''];
  if (sc.description) out.push(para(sc.description));
  if (sc.traits.length) {
    out.push('## Traits', '');
    sc.traits.forEach((t) => out.push(`- **${t.name || 'Unnamed'}:** ${indent(t.description)}`));
    out.push('');
  }
  if (sc.spellTypes) out.push('## Types of Spells', '', para(sc.spellTypes));
  if (sc.restrictions) out.push('## Possible Restrictions', '', para(sc.restrictions));
  if (sc.whoUses) out.push('## Who Would Use This Magic', '', para(sc.whoUses));
  if (sc.figures.length) {
    out.push('## Notable Figures', '');
    sc.figures.forEach((f) => out.push(`### ${f.name || 'Unnamed'}`, para(f.description)));
  }
  const spells = spellsInSchool(sc.name);
  if (spells.length) out.push('## Spells', '', ...spells.map((sp) => `- ${sp.name}`), '');
  if (sc.notes) out.push('## Designer Notes', '', para(sc.notes));
  return out.join('\n');
}

/* ======================================================================
 * Rules
 * ==================================================================== */

/** Exact (case-insensitive) name match, else the closest fuzzy match. */
function findRuleByName(name, exactOnly = false) {
  const n = normText(name);
  const exact = db.rules.find((r) => normText(r.name) === n);
  if (exact || exactOnly) return exact || null;
  return bestMatch(db.rules, name, COLLECTIONS.rules.fields);
}

function openRule(rule, mode = 'preview') {
  ui.tab = 'rules';
  ui.selected.rules = rule.id;
  ui.mode = mode;
  ui.search = '';
  render();
}

function renderRuleEditor(r) {
  const categories = Array.from(new Set(db.rules.map((x) => x.category).filter(Boolean))).sort();
  const wrap = h('div', {});
  wrap.append(h('div', { class: 'section' },
    h('h2', {}, 'Rule'),
    h('div', { class: 'row' },
      field('Rule name', r, 'name', { onInput: () => { renderList(); document.querySelector('.editor-head h1').textContent = r.name || '(unnamed)'; } }),
      field('Category', r, 'category', { datalist: categories, placeholder: 'e.g. Combat, Character Progression', onInput: renderList })),
    field('Summary (one line)', r, 'summary', { placeholder: 'The rule in one sentence', onInput: renderList }),
    field('Full rule text', r, 'text', { type: 'textarea', rows: 10 }),
    h('p', { class: 'hint' }, 'Formatting: **bold**, *italic*, "- " for bullet lists. Link another rule by writing its name in double brackets, like [[Ascension Points]] or [[Augmentations|a custom label]]. Links work in Preview.'),
    field('Keywords / aliases (comma separated)', r, 'keywords', { placeholder: 'e.g. grab, hold, restrain (words people might search for instead of the rule name)' })));

  // Related rules
  const rel = h('div', { class: 'section' }, h('h2', {}, 'Related Rules'));
  const chips = h('div', { class: 'chips' });
  r.related.map((id) => db.rules.find((x) => x.id === id)).filter(Boolean).forEach((other) => {
    chips.append(h('span', { class: 'chip' },
      h('a', { href: '#', onclick: (ev) => { ev.preventDefault(); openRule(other, 'edit'); } }, other.name || '(unnamed)'),
      h('button', { class: 'small', title: 'Remove link', onclick: () => { r.related = r.related.filter((x) => x !== other.id); touch(); render(); } }, '×')));
  });
  if (!chips.children.length) chips.append(h('span', { class: 'muted' }, 'None yet.'));
  const addSel = h('select', {}, h('option', { value: '' }, '+ Link a related rule…'),
    db.rules.filter((x) => x.id !== r.id && !r.related.includes(x.id)).sort((a, b) => a.name.localeCompare(b.name))
      .map((x) => h('option', { value: x.id }, x.name || '(unnamed)')));
  addSel.addEventListener('change', () => {
    if (!addSel.value) return;
    r.related.push(addSel.value);
    const other = db.rules.find((x) => x.id === addSel.value);
    if (other && !other.related.includes(r.id)) other.related.push(r.id); // links go both ways
    touch();
    render();
  });
  rel.append(chips, h('div', { style: 'max-width:360px;margin-top:10px' }, addSel));
  wrap.append(rel);

  // Rules that link here via [[...]]
  const backlinks = db.rules.filter((x) => x.id !== r.id && new RegExp(`\\[\\[\\s*${r.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\]\\]`, 'i').test(x.text));
  if (backlinks.length) {
    wrap.append(h('div', { class: 'section' }, h('h2', {}, 'Mentioned In'),
      h('ul', {}, backlinks.map((x) => h('li', {}, h('a', { href: '#', onclick: (ev) => { ev.preventDefault(); openRule(x); } }, x.name))))));
  }

  wrap.append(h('div', { class: 'section' }, h('h2', {}, 'Designer Notes'),
    field('', r, 'notes', { type: 'textarea', rows: 3 })));
  return wrap;
}

function ruleToMd(r) {
  const out = [`# ${r.name}`];
  if (r.category) out.push(`*${r.category}*`);
  out.push('');
  if (r.summary) out.push(`**${r.summary.trim()}**`, '');
  if (r.text) out.push(r.text.trim(), '');
  const related = r.related.map((id) => db.rules.find((x) => x.id === id)).filter(Boolean);
  if (related.length) out.push(`**Related:** ${related.map((x) => `[[${x.name}]]`).join(', ')}`, '');
  if (r.keywords) out.push(`*Keywords: ${r.keywords}*`, '');
  if (r.notes) out.push('## Designer Notes', '', para(r.notes));
  return out.join('\n');
}

/* ======================================================================
 * Simple collections described by a form schema:
 * Weapons, Weapon Traits, Mech Modules
 * ==================================================================== */

const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
const sameName = (a, b) => normText(a) === normText(b);
const traitByName = (name) => db.traits.find((t) => sameName(t.name, name));
const weaponsWithTrait = (name) => db.weapons.filter((w) => sameName(w.talent, name) || w.profiles.some((p) => p.talent && sameName(p.talent, name)));
const traitNames = () => db.traits.map((t) => t.name).sort();

function openEntry(tab, entry, mode = 'edit') {
  ui.tab = tab;
  ui.selected[tab] = entry.id;
  ui.mode = mode;
  ui.search = '';
  render();
}
const entryLink = (tab, e) => h('a', { href: '#', onclick: (ev) => { ev.preventDefault(); openEntry(tab, e); } }, e.name || '(unnamed)');

function weaponToMd(w) {
  const out = [`# ${w.name}`, w.group ? `*${w.group}*` : '', ''];
  if (w.description) out.push(para(w.description));
  const anyRange = w.profiles.some((p) => p.range);
  const anyTalent = w.profiles.some((p) => p.talent);
  out.push(`| Attack Type | AP | Base Damage | Crit | Epic${anyRange ? ' | Range' : ''}${anyTalent ? ' | Talent' : ''} |`,
    `|---|---|---|---|---${anyRange ? '|---' : ''}${anyTalent ? '|---' : ''}|`);
  w.profiles.forEach((p) => out.push(`| ${p.attackType} | ${p.ap} | ${[p.damage, p.damageType].filter(Boolean).join(' ')} | ${p.crit} | ${p.epic}${anyRange ? ` | ${p.range}` : ''}${anyTalent ? ` | ${p.talent || w.talent}` : ''} |`));
  out.push('');
  uniq([w.talent, ...w.profiles.map((p) => p.talent)]).forEach((name) => {
    const t = traitByName(name);
    out.push(`**Specialized Talent: ⟨${name}⟩**${t ? ` *(${t.rarity})*: ${t.effect}` : ' *(not in the Weapon Traits list)*'}`, '');
  });
  if (w.notes) out.push('## Designer Notes', '', para(w.notes));
  return out.join('\n');
}

function traitToMd(t) {
  const ws = weaponsWithTrait(t.name);
  const out = [`# ⟨${t.name}⟩`, `*${t.rarity}*`, '', para(t.effect)];
  if (ws.length) out.push(`**Weapons with this talent:** ${ws.map((w) => w.name).join(', ')}`, '');
  if (t.notes) out.push('## Designer Notes', '', para(t.notes));
  return out.join('\n');
}

function moduleToMd(m) {
  const out = [`# ${m.name}`, `*${m.category} · Complexity ${m.complexity}*`, ''];
  if (m.cost) out.push(`**Activation / Cost:** ${m.cost}`, '');
  if (m.visual) out.push(`> ${oneLine(m.visual)}`, '');
  if (m.effect) out.push(`**Effect:** ${m.effect}`, '');
  if (m.execution) out.push(`*${oneLine(m.execution)}*`, '');
  if (m.scaling) out.push(`**Ascension Scaling:** ${m.scaling}`, '');
  if (m.notes) out.push('## Designer Notes', '', para(m.notes));
  return out.join('\n');
}

const SCHEMAS = {
  weapons: {
    label: 'Weapon', create: newWeapon,
    sub: (w) => {
      const p = w.profiles[0] || {};
      return [uniq(w.profiles.map((x) => x.attackType)).join('/'), p.ap && `${p.ap} AP`, [p.damage, p.damageType].filter(Boolean).join(' '), w.talent && `⟨${w.talent}⟩`].filter(Boolean).join(' · ');
    },
    group: (w) => w.group || 'Ungrouped',
    groupOrder: () => uniq(db.weapons.map((w) => w.group)),
    fields: (w) => [[w.name, 3], [joinText(w.group, w.talent), 2], [joinText(w.description, w.notes, w.profiles.map((p) => [p.attackType, p.damageType, p.talent])), 1]],
    form: [
      { key: 'name', label: 'Weapon name', title: true },
      { key: 'group', label: 'Weapon group', datalist: () => uniq(db.weapons.map((w) => w.group)) },
      { key: 'talent', label: 'Specialized talent', type: 'select', options: traitNames, rerender: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      {
        key: 'profiles', label: 'Attack Profiles', type: 'list', create: newProfile,
        hint: 'One profile per way of attacking (e.g. Long Sword has a Graceful and a Might profile).',
        itemTitle: (p, i) => `${p.attackType || `Profile ${i + 1}`}${p.damage ? ` · ${p.damage} ${p.damageType}` : ''}`,
        form: [
          { key: 'attackType', label: 'Attack type', type: 'select', options: () => db.settings.attackTypes },
          { key: 'ap', label: 'AP' },
          { key: 'damage', label: 'Base damage' },
          { key: 'damageType', label: 'Damage type', datalist: () => db.settings.damageTypes },
          { key: 'crit', label: 'Crit' },
          { key: 'epic', label: 'Epic' },
          { key: 'range', label: 'Range' },
          { key: 'talent', label: 'Talent (if different)', type: 'select', options: traitNames, blankLabel: '— same as weapon —' },
        ],
      },
      { key: 'notes', label: 'Designer notes', type: 'textarea' },
    ],
    extra: (w) => {
      const t = traitByName(w.talent);
      if (!w.talent) return null;
      return h('div', { class: 'section' }, h('h2', {}, `Specialized Talent: ⟨${w.talent}⟩`),
        t ? h('p', {}, h('span', { class: 'badge type' }, t.rarity), ' ', t.effect, ' ', entryLink('traits', t))
          : h('p', { class: 'badge warn' }, '⚠ This talent is not in the Weapon Traits list yet.'));
    },
    md: weaponToMd,
  },
  traits: {
    label: 'Weapon Trait', create: newTrait,
    sub: (t) => `${weaponsWithTrait(t.name).length} weapon(s) · ${oneLine(t.effect).slice(0, 60)}`,
    group: (t) => t.rarity || 'No rarity',
    groupOrder: () => TRAIT_RARITIES,
    fields: (t) => [[t.name, 3], [t.rarity, 2], [joinText(t.effect, t.notes), 1]],
    form: [
      { key: 'name', label: 'Trait name', title: true, onRename: (t, oldName, newName) => {
        db.weapons.forEach((w) => {
          if (sameName(w.talent, oldName)) w.talent = newName;
          w.profiles.forEach((p) => { if (p.talent && sameName(p.talent, oldName)) p.talent = newName; });
        });
      } },
      { key: 'rarity', label: 'Rarity', type: 'select', options: () => TRAIT_RARITIES, onInput: () => renderList() },
      { key: 'effect', label: 'Effect', type: 'textarea', rows: 3 },
      { key: 'notes', label: 'Designer notes', type: 'textarea' },
    ],
    extra: (t) => {
      const ws = weaponsWithTrait(t.name);
      return h('div', { class: 'section' }, h('h2', {}, `Weapons with this talent (${ws.length})`),
        ws.length ? h('ul', {}, ws.map((w) => h('li', {}, entryLink('weapons', w), h('span', { class: 'muted' }, ` · ${w.group}`)))) : h('p', { class: 'muted' }, 'None yet.'));
    },
    md: traitToMd,
  },
  modules: {
    label: 'Mech Module', create: newModule,
    sub: (m) => `Complexity ${m.complexity}${m.cost ? ` · ${m.cost}` : ''}`,
    group: (m) => m.category || 'Uncategorized',
    groupOrder: () => MODULE_CATEGORIES,
    fields: (m) => [[m.name, 3], [joinText(m.category, m.cost), 2], [joinText(m.visual, m.effect, m.execution, m.scaling, m.notes), 1]],
    form: [
      { key: 'name', label: 'Module name', title: true },
      { key: 'category', label: 'Category', type: 'select', options: () => MODULE_CATEGORIES, onInput: () => renderList() },
      { key: 'complexity', label: 'Complexity', type: 'number', onInput: () => renderList() },
      { key: 'cost', label: 'Activation / cost', onInput: () => renderList() },
      { key: 'visual', label: 'Visual', type: 'textarea', rows: 2 },
      { key: 'effect', label: 'Effect / attack', type: 'textarea', rows: 3 },
      { key: 'execution', label: 'Execution (flavor)', type: 'textarea', rows: 2 },
      { key: 'scaling', label: 'Ascension scaling', placeholder: 'e.g. Every 2500 Ascension, damage increases by +1.' },
      { key: 'notes', label: 'Designer notes', type: 'textarea' },
    ],
    md: moduleToMd,
  },
};
Object.assign(COLLECTIONS, SCHEMAS);

/** Render form fields from a schema; short fields share rows. */
function renderForm(obj, form, entry) {
  const out = [];
  let row = null;
  const flushRow = () => { if (row) { out.push(row); row = null; } };
  form.forEach((f) => {
    const options = typeof f.options === 'function' ? f.options() : f.options;
    const datalist = typeof f.datalist === 'function' ? f.datalist() : f.datalist;
    if (f.type === 'list') {
      flushRow();
      out.push(renderListField(obj, f, entry));
      return;
    }
    let onInput = f.onInput;
    if (f.title) {
      let prev = obj[f.key];
      onInput = (v) => { if (f.onRename) f.onRename(obj, prev, v); prev = v; titleUpdater(obj)(); };
    }
    const el = field(f.label, obj, f.key, {
      type: f.type || 'text', options, datalist, rows: f.rows, placeholder: f.placeholder, onInput, rerender: f.rerender,
      blankLabel: f.blankLabel,
    });
    if (f.type === 'textarea') { flushRow(); out.push(el); return; }
    if (!row) row = h('div', { class: 'row' });
    row.append(el);
    if (row.children.length >= 4) flushRow();
  });
  flushRow();
  return out;
}

function renderListField(obj, f, entry) {
  const arr = obj[f.key];
  const sec = h('div', { class: 'section' },
    h('h2', {}, f.label, h('span', { class: 'spacer' }),
      h('button', { class: 'small', onclick: () => { arr.push(f.create()); touch(); render(); } }, '+ Add')),
    f.hint ? h('p', { class: 'hint' }, f.hint) : null);
  if (!arr.length) sec.append(h('p', { class: 'muted' }, 'None yet.'));
  arr.forEach((item, i) => sec.append(h('div', { class: 'subcard' },
    h('div', { class: 'subcard-head' }, h('strong', {}, f.itemTitle ? f.itemTitle(item, i) : `${i + 1}`),
      h('button', { class: 'small', onclick: () => { moveInArray(arr, i, -1); touch(); render(); } }, '↑'),
      h('button', { class: 'small', onclick: () => { moveInArray(arr, i, 1); touch(); render(); } }, '↓'),
      h('button', { class: 'small danger', onclick: () => { arr.splice(i, 1); touch(); render(); } }, 'Remove')),
    renderForm(item, f.form, entry))));
  return sec;
}

function renderSchemaEditor(e, schema) {
  const main = schema.form.filter((f) => f.type !== 'list' && f.key !== 'notes');
  const lists = schema.form.filter((f) => f.type === 'list');
  const notes = schema.form.find((f) => f.key === 'notes');
  return h('div', {},
    h('div', { class: 'section' }, h('h2', {}, schema.label), renderForm(e, main, e)),
    schema.extra ? schema.extra(e) : null,
    lists.map((f) => renderListField(e, f, e)),
    notes ? h('div', { class: 'section' }, h('h2', {}, 'Designer Notes'), field('', e, 'notes', { type: 'textarea', rows: 3 })) : null);
}

/* ======================================================================
 * Settings
 * ==================================================================== */

function listEditor(label, key, hint) {
  const ta = h('textarea', { rows: 6 });
  ta.value = db.settings[key].join('\n');
  ta.addEventListener('input', () => {
    db.settings[key] = ta.value.split('\n').map((x) => x.trim()).filter(Boolean);
    save();
  });
  return h('label', { class: 'field' }, h('span', {}, label), ta, hint ? h('small', { class: 'muted' }, hint) : null);
}

function renderSettings() {
  const costs = db.settings.costs;
  const total = SEEDED_COLLECTIONS.map((k) => `${db[k].length} ${k}`).join(', ');
  return h('div', { style: 'max-width:900px' },
    h('div', { class: 'editor-head' }, h('h1', {}, 'Settings')),
    h('div', { class: 'section' },
      h('h2', {}, 'Lists'),
      h('p', { class: 'hint' }, 'One entry per line. These fill the dropdowns throughout the app.'),
      h('div', { class: 'row' },
        listEditor('Class node types', 'nodeTypes'),
        listEditor('Attack node types', 'attackNodeTypes', 'Hidden on Non-Combat classes.')),
      h('div', { class: 'row' },
        listEditor('Attack types', 'attackTypes', 'Used by weapons and items (see the Attack Types rule).'),
        listEditor('Damage types', 'damageTypes')),
      h('div', { class: 'row' },
        listEditor('Item action types', 'itemActionTypes'),
        h('div', { class: 'field' }, h('span', {}, 'Schools of magic'), h('small', { class: 'muted' }, 'Schools are edited in the Schools tab.')))),
    h('div', { class: 'section' },
      h('h2', {}, 'Ascension Point Costs'),
      h('div', { class: 'row' },
        field('Core node', costs, 'classNode', { type: 'number' }),
        field('Augmentation node', costs, 'augmentNode', { type: 'number' }),
        field('Free fracture', costs, 'fractureFree', { type: 'number' }),
        field('Lesser fracture', costs, 'fractureLesser', { type: 'number' }),
        field('Greater fracture', costs, 'fractureGreater', { type: 'number' }))),
    h('div', { class: 'section' },
      h('h2', {}, 'AOE Content'),
      h('p', { class: 'hint' }, 'The classes, rules, weapons, weapon traits and mech modules from your design notes (notes/ folder) are built into js/aoe-data.js. Reloading puts the original imported version back for those entries (same IDs are overwritten; anything you created yourself is kept).'),
      h('button', { onclick: reloadSeed }, 'Reload AOE content from notes')),
    h('div', { class: 'section' },
      h('h2', {}, 'Data'),
      h('p', { class: 'hint' }, `Everything is stored in this browser. Export JSON regularly as a backup — clearing browser data deletes it. Currently: ${total}, ${db.items.length} items, ${db.spells.length} spells, ${db.schools.length} schools.`),
      h('div', { class: 'row' },
        h('button', { onclick: async () => { if (await askConfirm('Add an example item and spell?', { ok: 'Add examples' })) { const ex = exampleContent(); db.items.push(...ex.items); db.spells.push(...ex.spells); save(); render(); } } }, 'Add examples'),
        h('button', { class: 'danger', onclick: resetAll }, 'Reset ALL data'))));
}

async function reloadSeed() {
  if (!await askConfirm('Overwrite imported classes, rules, weapons, traits and modules with the versions from your notes? Edits you made to those entries will be lost (entries you created yourself are kept).', { ok: 'Reload', danger: true })) return;
  const seed = normalizeDb(Object.assign({}, seedContent(), { schools: db.schools }));
  let n = 0;
  SEEDED_COLLECTIONS.forEach((key) => {
    seed[key].forEach((e) => {
      const idx = db[key].findIndex((x) => x.id === e.id);
      if (idx >= 0) db[key][idx] = e; else db[key].push(e);
      n++;
    });
  });
  save();
  render();
  notify(`Reloaded ${n} entries from the notes.`);
}

async function resetAll() {
  if (!await askConfirm('Reset ALL data to the starter content? Everything you added or changed is lost. Export a JSON backup first if unsure.', { ok: 'Reset everything', danger: true, title: 'Reset all data' })) return;
  db = emptyDb();
  ui.selected = { classes: null, items: null, spells: null, schools: OVERVIEW_ID, rules: null, weapons: null, traits: null, modules: null };
  save();
  render();
}

/* ======================================================================
 * Markdown export + tiny renderer for previews
 * ==================================================================== */

const indent = (t) => String(t || '').split('\n').filter((l) => l.trim()).join('\n  ');
const para = (t) => (t && t.trim() ? t.trim() + '\n' : '');

const oneLine = (t) => String(t || '').replace(/\s*\n\s*/g, ' ').trim();

/** Fractures in tree order (parents before the fractures that build on them). */
function orderedFractures(p) {
  const ids = new Set(p.fractures.map((f) => f.id));
  const out = [];
  const seen = new Set();
  const visit = (f, depth) => {
    if (seen.has(f.id)) return;
    seen.add(f.id);
    out.push({ f, depth });
    p.fractures.filter((x) => x.requires === f.id).forEach((x) => visit(x, depth + 1));
  };
  p.fractures.filter((f) => !f.requires || !ids.has(f.requires)).forEach((f) => visit(f, 0));
  p.fractures.forEach((f) => visit(f, 0)); // anything in a cycle
  return out;
}

function classToMd(c) {
  const out = [];
  const k = classCosts(c);
  out.push(`# ${c.name}`, `*${CLASS_KINDS[c.kind].label} · ${maxLevel(c.kind)} Core Nodes*`, '');
  if (c.summary) out.push(`**${c.summary}**`, '');
  if (c.identity) out.push('## Class Identity', '', para(c.identity));
  if (c.resources.length) {
    out.push('## Base Resources', '');
    c.resources.forEach((r) => out.push(`- **${r.name || 'Resource'}:** ${oneLine(r.description)}`));
    out.push('');
  }
  const pr = c.proficiencies;
  const profs = [['Armor', pr.armor], ['Weapons', pr.weapons], ['Tool Mastery', pr.tools], ['Stat Focus', pr.statFocus]].filter((x) => x[1]);
  if (profs.length) out.push('## Recommended Proficiencies', '*Granted on first class*', '', ...profs.map(([l, v]) => `- **${l}:** ${v}`), '');

  if (c.augmentations.length) {
    out.push('## Augmentation Paths', '');
    c.augmentations.forEach((a) => out.push(`### ${a.name || 'Unnamed Path'}`, para(a.philosophy)));
  }

  out.push('## Core Nodes', '');
  c.nodes.slice(0, maxLevel(c.kind)).forEach((n) => {
    const tags = [n.isAugment ? 'Augmentation Node' : '', n.isFractured ? 'Fracture Node' : ''].filter(Boolean);
    if (!n.name && !n.description && !tags.length) {
      out.push(`### ${n.level}. *Not written yet*`, '');
      return;
    }
    out.push(`### ${n.level}. ${n.name || 'Unnamed'}${tags.length ? ` · [${tags.join(', ')}]` : ''}`);
    if (n.flavor) out.push(`*${n.flavor}*`, '');
    const meta = [n.type && `*${n.type}*`, n.cost && n.cost !== n.type && `**${n.cost}**`].filter(Boolean).join(' · ');
    if (meta) out.push(meta, '');
    if (n.description) out.push(n.description.trim(), '');
    if (n.grants) out.push('**In addition:**', n.grants.trim(), '');
    if (n.isAugment) {
      c.augmentations.forEach((a) => {
        const v = n.augments.find((x) => x.augId === a.id);
        if (!v || !(v.name || v.description)) return;
        out.push(`#### ◆ ${a.name || 'Augmentation'}${v.name ? `: ${v.name}` : ''}`);
        if (v.tagline) out.push(`*${v.tagline}*`, '');
        const vmeta = [v.type && v.type !== n.type && `*${v.type}*`, v.cost && `**${v.cost}**`].filter(Boolean).join(' · ');
        if (vmeta) out.push(vmeta, '');
        if (v.appearance) out.push(...v.appearance.trim().split('\n').filter((l) => l.trim()).map((l) => `> ${l}`), '');
        if (v.description) out.push(v.description.trim(), '');
        if (v.flaw) out.push(`**Flaw:** ${oneLine(v.flaw)}`, '');
        if (v.quote) out.push(`*“${oneLine(v.quote)}”*`, '');
      });
    }
    if (n.isFractured) {
      n.fracturePaths.forEach((p, pi) => {
        out.push(`#### ⟡ Fracture Path ${pi + 1}${p.name ? `: ${p.name}` : ''} · ${fmt(pathCost(p))} Asc`);
        if (p.description) out.push(`*${p.description.trim()}*`);
        out.push('');
        orderedFractures(p).forEach(({ f, depth }) => {
          out.push(`##### ${'↳ '.repeat(depth)}${f.name || 'Unnamed'} · ${f.tier} (${fmt(tierCost(f.tier))} Asc)`);
          if (f.cost) out.push(`**${f.cost}**`, '');
          if (f.description) out.push(f.description.trim());
          out.push('');
        });
      });
    }
    if (n.notes) out.push(`*✎ Designer note: ${oneLine(n.notes)}*`, '');
  });

  out.push('## Ascension Summary', '',
    `- All ${k.levels} core nodes: ${fmt(k.base)} Asc`,
    `- Augmentation nodes: ${k.augNodes} (${fmt(db.settings.costs.augmentNode)} Asc each)`,
    `- Fractured nodes: ${k.fracturedNodes} (${k.paths} paths, ${k.fractures} fractures, ${k.greater} Greater)`,
    `- Every fracture combined: ${fmt(k.fractureTotal)} Asc`,
    `- Everything: ${fmt(k.base + k.augTotal + k.fractureTotal)} Asc`, '');
  if (c.notes) out.push('## Designer Notes', '', para(c.notes));
  return out.join('\n');
}

function itemToMd(it) {
  const out = [`# ${it.name}`, `*Attack Type: ${it.attackAttribute || '—'}*`, ''];
  if (it.description) out.push(para(it.description));
  out.push('## Actions', '');
  it.actions.forEach((a) => out.push(`- **${a.name || 'Unnamed'}**${a.type ? ` *(${a.type})*` : ''} — ${indent(a.description)}`));
  out.push('');
  out.push(`## Unique Attribute: ${it.unique.name || 'Unnamed'}`, '', para(it.unique.description));
  if (it.notes) out.push('## Designer Notes', '', para(it.notes));
  return out.join('\n');
}

function spellToMd(sp) {
  const out = [`# ${sp.name}`, `*School: ${sp.school || '—'} · ${sp.costType} Cost: ${sp.cost || '—'} · AP Cost: ${sp.apCost || '—'}*`, ''];
  if (sp.description) out.push(para(sp.description));
  out.push('## Action', '', para(sp.actionDescription || '—'));
  if (sp.adaptations.length) {
    out.push('## School Adaptations', '');
    sp.adaptations.forEach((a) => {
      out.push(`### ${a.school || 'Unassigned'}`);
      if (a.mechanical) out.push(`**Mechanical:** ${a.mechanical.trim()}`);
      if (a.visual) out.push(`**Visual:** ${a.visual.trim()}`);
      out.push('');
    });
  }
  if (sp.notes) out.push('## Designer Notes', '', para(sp.notes));
  return out.join('\n');
}

function toMarkdown(tab, e) {
  if (tab === 'classes') return classToMd(e);
  if (tab === 'items') return itemToMd(e);
  if (tab === 'schools') return schoolToMd(e);
  if (tab === 'rules') return ruleToMd(e);
  if (SCHEMAS[tab]) return SCHEMAS[tab].md(e);
  return spellToMd(e);
}

function allToMarkdown() {
  const byName = (a, b) => (a.name || '').localeCompare(b.name || '');
  const demote = (md) => md.replace(/^(#{1,5}) /gm, '#$1 ');
  const parts = ['# RPG Design Forge Export', `*Exported ${new Date().toLocaleString()}*`, ''];
  const ov = db.lore.magicOverview;
  if (ov.text) parts.push(`# ${ov.title || 'Magic Overview'}`, '', para(ov.text));
  [['Classes', 'classes'], ['Items', 'items'], ['Weapons', 'weapons'], ['Weapon Traits', 'traits'], ['Mech Modules', 'modules'], ['Schools of Magic', 'schools'], ['Spells', 'spells'], ['Rules', 'rules']].forEach(([title, key]) => {
    if (!db[key].length) return;
    parts.push(`# ${title}`, '');
    db[key].slice().sort(byName).forEach((e) => parts.push(demote(toMarkdown(key, e)), '---', ''));
  });
  return parts.join('\n');
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
function inlineMd(s) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/\[\[(.+?)\]\]/g, (m, inner) => {
      const [target, label] = inner.split('|');
      const t = target.trim();
      return `<a href="#" class="rule-link${findRuleByName(t, true) ? '' : ' missing'}" data-rule="${t}">${(label || target).trim()}</a>`;
    });
}

/** Small Markdown renderer: headings, paragraphs, nested "-" lists, tables, quotes, rules. */
function mdToHtml(md) {
  const lines = md.split('\n');
  let html = '';
  let paraLines = [];
  const stack = []; // indent widths of open <ul>s
  const flush = () => { if (paraLines.length) { html += '<p>' + paraLines.map(inlineMd).join('<br>') + '</p>'; paraLines = []; } };
  const closeLists = (toIndent = -1) => {
    while (stack.length && stack[stack.length - 1] > toIndent) { html += '</li></ul>'; stack.pop(); }
  };
  const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((x) => x.trim());
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    if (!line.trim()) { flush(); closeLists(); continue; }
    if (/^\s*\|.*\|\s*$/.test(line)) {
      flush(); closeLists();
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(lines[i++]);
      i--;
      const hasHead = rows.length > 1 && /^\s*\|[\s:|-]+\|\s*$/.test(rows[1]);
      const head = hasHead ? `<thead><tr>${cells(rows[0]).map((c) => `<th>${inlineMd(c)}</th>`).join('')}</tr></thead>` : '';
      const bodyRows = (hasHead ? rows.slice(2) : rows).map((r) => `<tr>${cells(r).map((c) => `<td>${inlineMd(c)}</td>`).join('')}</tr>`).join('');
      html += `<table>${head}<tbody>${bodyRows}</tbody></table>`;
      continue;
    }
    if (line.trim() === '---') { flush(); closeLists(); html += '<hr>'; continue; }
    if ((m = line.match(/^(#{1,6})\s+(.*)$/))) { flush(); closeLists(); const l = m[1].length; html += `<h${l}>${inlineMd(m[2])}</h${l}>`; continue; }
    if ((m = line.match(/^(\s*)[-•]\s+(.*)$/))) {
      flush();
      const ind = m[1].length;
      if (stack.length && ind <= stack[stack.length - 1]) {
        closeLists(ind);
        if (stack.length && stack[stack.length - 1] === ind) html += '</li><li>';
        else { html += '<ul><li>'; stack.push(ind); }
      } else { html += '<ul><li>'; stack.push(ind); }
      html += inlineMd(m[2]);
      continue;
    }
    if (stack.length && /^\s+\S/.test(line)) { html += '<br>' + inlineMd(line.trim()); continue; }
    if ((m = line.match(/^> ?(.*)$/))) { flush(); closeLists(); html += `<blockquote>${inlineMd(m[1])}</blockquote>`; continue; }
    closeLists();
    paraLines.push(line);
  }
  flush();
  closeLists();
  return html;
}

/* ======================================================================
 * Import / export / clipboard
 * ==================================================================== */

const slug = (s) => (s || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled';

function download(filename, text, mime = 'text/plain') {
  if (IN_FRAME) {
    // Hosted pages can't start downloads: show the text to copy instead.
    const what = mime.includes('json') ? 'Paste it into a .json file to keep a backup, or into Import JSON on another device.' : 'Paste it into a document or a .md file.';
    showText(filename, text, `Downloads are blocked on this hosted page. Copy the text below. ${what}`);
    return;
  }
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    setStatus('Copied to clipboard ✓');
  } catch {
    showText('Copy this text', text);
  }
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const incoming = normalizeDb(JSON.parse(reader.result));
      const counts = { classes: 0, items: 0, spells: 0, schools: 0, rules: 0, weapons: 0, traits: 0, modules: 0 };
      Object.keys(counts).forEach((key) => {
        incoming[key].forEach((e) => {
          const idx = db[key].findIndex((x) => x.id === e.id);
          if (idx >= 0) db[key][idx] = e; else db[key].push(e);
          counts[key]++;
        });
      });
      if (await askConfirm('Also replace your Settings (lists & costs) and Magic Overview with the ones from this file?', { ok: 'Replace settings', cancel: 'Keep mine' })) { db.settings = incoming.settings; db.lore = incoming.lore; }
      save();
      render();
      notify(`Imported ${counts.classes} classes, ${counts.items} items, ${counts.spells} spells, ${counts.schools} schools, ${counts.rules} rules, ${counts.weapons} weapons, ${counts.traits} weapon traits, ${counts.modules} modules. Entries with matching IDs were overwritten.`);
    } catch (e) {
      notify('That file could not be read as RPG Design Forge JSON. ' + e.message, 'Import failed');
    }
  };
  reader.readAsText(file);
}

/* ======================================================================
 * Boot
 * ==================================================================== */

document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', () => {
  ui.tab = b.dataset.tab;
  ui.search = '';
  render();
}));
document.getElementById('editor').addEventListener('click', async (ev) => {
  const a = ev.target.closest('.rule-link');
  if (!a) return;
  ev.preventDefault();
  const name = a.dataset.rule;
  const rule = findRuleByName(name);
  if (rule) { openRule(rule); return; }
  if (await askConfirm(`There's no rule called "${name}". Create it now?`, { ok: 'Create rule' })) {
    const r = newRule();
    r.name = name;
    db.rules.push(r);
    save();
    openRule(r, 'edit');
  }
});
document.getElementById('btn-export-json').addEventListener('click', () => {
  download(`rpg-forge-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(db, null, 2), 'application/json');
});
document.getElementById('btn-export-md').addEventListener('click', () => {
  download(`rpg-forge-${new Date().toISOString().slice(0, 10)}.md`, allToMarkdown(), 'text/markdown');
});
document.getElementById('file-import').addEventListener('change', (ev) => {
  const f = ev.target.files[0];
  if (f) importJson(f);
  ev.target.value = '';
});

// Select the first entry of each collection on startup.
['classes', 'items', 'spells', 'rules', 'weapons', 'traits', 'modules'].forEach((k) => { if (db[k][0]) ui.selected[k] = db[k][0].id; });
save();
render();
