/* RPG Design Forge — class, item and spell design tool.
 * Plain JavaScript, no build step. Data lives in localStorage and can be
 * exported/imported as JSON or exported as Markdown.
 */
'use strict';

const STORAGE_KEY = 'rpg-forge-data-v1';
const DATA_VERSION = 1;

// Attack attributes are fixed by the game rules.
const ATTACK_ATTRIBUTES = ['Strength', 'Dexterity', 'Wittyness', 'Intelligence'];
const CLASS_KINDS = { combat: { label: 'Combat Class', levels: 20 }, noncombat: { label: 'Non-Combat Class', levels: 10 } };
const COST_TYPES = ['Mana', 'UP'];
const OVERVIEW_ID = '__overview__'; // pinned "Magic Overview" entry in the Schools tab

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const clone = (o) => JSON.parse(JSON.stringify(o));
const fmt = (n) => Number(n || 0).toLocaleString();

/* ======================================================================
 * Data model
 * ==================================================================== */

function defaultSettings() {
  return {
    nodeTypes: ['Action', 'Reaction', 'Attack Action', 'Attack Reaction', 'Passive', 'Unique Ability'],
    attackNodeTypes: ['Attack Action', 'Attack Reaction'],
    itemActionTypes: ['Attack Action', 'Reaction', 'Special Attack', 'Action', 'Passive'],
    costs: { classNode: 500, augmentNode: 500, firstFracture: 500, additionalFracture: 250, masterFracture: 500 },
  };
}

const maxLevel = (kind) => (CLASS_KINDS[kind] || CLASS_KINDS.combat).levels;

function newNode(level) {
  return { level, name: '', type: '', description: '', isAugment: false, augments: [], isFractured: false, fracturePaths: [] };
}
function newClass(kind = 'combat') {
  return {
    id: uid(), name: 'New Class', kind, summary: '', description: '', notes: '',
    augmentations: [],
    nodes: Array.from({ length: maxLevel(kind) }, (_, i) => newNode(i + 1)),
    updated: Date.now(),
  };
}
function newItem() {
  return {
    id: uid(), name: 'New Item', description: '', attackAttribute: 'Strength',
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
const newFracturePath = () => ({ id: uid(), name: '', description: '', fractures: [], master: null });
const newFracture = () => ({ id: uid(), name: '', description: '' });

function emptyDb() {
  return {
    version: DATA_VERSION, settings: defaultSettings(), classes: [], items: [], spells: [],
    schools: defaultSchools(), lore: { magicOverview: Object.assign({}, DEFAULT_MAGIC_OVERVIEW) },
  };
}

function exampleDb() {
  const db = emptyDb();
  const c = newClass('combat');
  c.name = 'Example: Ember Knight';
  c.summary = 'A frontline fighter who channels inner flame through their blade.';
  const augA = { id: uid(), name: 'Cinder Oath', philosophy: 'The flame is a burden to be contained. Power is drawn inward, favoring endurance over destruction.' };
  c.augmentations.push(augA);
  c.nodes[0] = Object.assign(c.nodes[0], { name: 'Kindled Strike', type: 'Attack Action', description: 'Make a melee attack. On hit, deal +1d4 fire damage.' });
  c.nodes[1] = Object.assign(c.nodes[1], { name: 'Heat Shimmer', type: 'Reaction', description: 'When targeted by a ranged attack, impose disadvantage.' });
  c.nodes[2] = Object.assign(c.nodes[2], {
    name: 'Burning Resolve', type: 'Passive', description: 'You gain +1 to all saves while above half health.',
    isAugment: true,
    augments: [{ augId: augA.id, name: 'Smoldering Resolve', type: 'Passive', description: 'You gain +1 to all saves while BELOW half health, and regain 1 HP at the start of your turn.' }],
  });
  const path = newFracturePath();
  path.name = 'Wildfire';
  path.description = 'Kindled Strike spreads to nearby enemies.';
  path.fractures.push({ id: uid(), name: 'Spark Jump', description: 'Fire damage also hits one enemy within 5ft of the target.' });
  path.fractures.push({ id: uid(), name: 'Spreading Blaze', description: 'Spark Jump can now hit up to two additional enemies.' });
  path.master = { name: 'Inferno Sweep', description: 'Kindled Strike becomes a cone attack. All creatures in a 15ft cone take the bonus fire damage.' };
  c.nodes[0].isFractured = true;
  c.nodes[0].fracturePaths.push(path);
  db.classes.push(c);

  const it = newItem();
  it.name = 'Example: Duelist\'s Needle';
  it.description = 'A slender rapier with a pearl pommel that hums when danger is near.';
  it.attackAttribute = 'Dexterity';
  it.actions = [
    { id: uid(), name: 'Thrust', type: 'Attack Action', description: '1d8 piercing damage.' },
    { id: uid(), name: 'Riposte', type: 'Reaction', description: 'When a melee attack misses you, make a Thrust against the attacker.' },
  ];
  it.unique = { name: 'Danger Sense', description: 'The wielder cannot be surprised and always acts in the first round of combat.' };
  db.items.push(it);

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
  db.spells.push(sp);
  return db;
}

/** Fill in any missing fields so older / hand-edited data still works. */
function normalizeDb(raw) {
  const db = Object.assign(emptyDb(), raw || {});
  db.settings = Object.assign(defaultSettings(), db.settings || {});
  db.settings.costs = Object.assign(defaultSettings().costs, db.settings.costs || {});
  delete db.settings.schools; // schools are now their own collection
  if (!raw || !Array.isArray(raw.schools)) db.schools = defaultSchools();
  db.schools = db.schools.map((sc) => {
    const school = Object.assign(newSchool(), sc);
    school.traits = (school.traits || []).map((t) => Object.assign({ id: uid(), name: '', description: '' }, t));
    school.figures = (school.figures || []).map((f) => Object.assign({ id: uid(), name: '', description: '' }, f));
    return school;
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
  return db;
}
function normalizeClass(c) {
  const cls = Object.assign(newClass(c.kind || 'combat'), c);
  cls.augmentations = (cls.augmentations || []).map((a) => Object.assign({ id: uid(), name: '', philosophy: '' }, a));
  const max = maxLevel(cls.kind);
  const nodes = [];
  for (let i = 0; i < max; i++) {
    const n = Object.assign(newNode(i + 1), (cls.nodes || [])[i] || {});
    n.level = i + 1;
    n.augments = (n.augments || []).map((v) => Object.assign({ augId: '', name: '', type: '', description: '' }, v));
    n.fracturePaths = (n.fracturePaths || []).map((p) => {
      const fp = Object.assign(newFracturePath(), p);
      fp.fractures = (fp.fractures || []).map((f) => Object.assign(newFracture(), f));
      return fp;
    });
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
  return exampleDb();
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
  selected: { classes: null, items: null, spells: null, schools: OVERVIEW_ID },
  mode: 'edit', // 'edit' | 'preview'
  search: '',
  open: new Set(), // open <details> keys
};

const schoolNames = () => db.schools.map((x) => x.name).filter(Boolean);
const spellsInSchool = (name) => db.spells.filter((sp) => name && sp.school === name);

const COLLECTIONS = {
  classes: { label: 'Class', create: () => newClass('combat'), sub: (c) => `${CLASS_KINDS[c.kind].label} · ${maxLevel(c.kind)} levels` },
  items: { label: 'Item', create: newItem, sub: (i) => `${i.attackAttribute || '—'} · ${i.actions.length} action(s)` },
  schools: { label: 'School', create: newSchool, sub: (sc) => `${sc.traits.length} trait(s) · ${spellsInSchool(sc.name).length} spell(s)` },
  spells: { label: 'Spell', create: newSpell, sub: (s) => `${s.school || 'No school'} · ${s.cost || '?'} ${s.costType} · ${s.apCost || '?'} AP` },
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
    input = h('input', { type, placeholder });
    input.value = obj[key] ?? '';
  }
  const evt = type === 'select' ? 'change' : 'input';
  input.addEventListener(evt, () => {
    obj[key] = type === 'number' ? (input.value === '' ? '' : Number(input.value)) : input.value;
    touch();
    if (onInput) onInput(obj[key]);
    if (rerender) render();
  });
  if (!label) return input;
  return h('label', { class: 'field ' + (cls || '') }, h('span', {}, label), input);
}

function checkbox(label, obj, key, onChange, disabledReason) {
  const input = h('input', { type: 'checkbox', disabled: !!disabledReason && !obj[key] });
  input.checked = !!obj[key];
  input.addEventListener('change', () => { obj[key] = input.checked; touch(); if (onChange) onChange(input.checked); render(); });
  return h('label', { class: 'check' + (input.disabled ? ' disabled' : ''), title: input.disabled ? disabledReason : null }, input, label);
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
  const search = h('input', { type: 'search', placeholder: `Search ${ui.tab}…` });
  search.value = ui.search;
  search.addEventListener('input', () => { ui.search = search.value; renderList(); });

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
  const q = ui.search.trim().toLowerCase();
  const entries = db[ui.tab]
    .filter((e) => !q || JSON.stringify(e).toLowerCase().includes(q))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const pinned = [];
  if (ui.tab === 'schools') {
    pinned.push(h('li', {
      class: ui.selected.schools === OVERVIEW_ID ? 'selected' : '',
      onclick: () => { ui.selected.schools = OVERVIEW_ID; render(); },
    }, h('div', { class: 'entry-name' }, `📜 ${db.lore.magicOverview.title || 'Magic Overview'}`), h('div', { class: 'entry-sub' }, 'Magic system overview')));
  }
  list.replaceChildren(...pinned, ...entries.map((e) => h('li', {
    class: e.id === ui.selected[ui.tab] ? 'selected' : '',
    onclick: () => { ui.selected[ui.tab] = e.id; render(); },
  }, h('div', { class: 'entry-name' }, e.name || '(unnamed)'), h('div', { class: 'entry-sub' }, coll.sub(e)))));
  if (!entries.length) list.append(h('li', { class: 'muted' }, q ? 'No matches.' : 'Nothing here yet.'));
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
  else body = renderSpellEditor(e);
  return h('div', {}, head, body);
}

function duplicateEntry(e) {
  const copy = clone(e);
  copy.id = uid();
  copy.name = `${e.name} (copy)`;
  addEntry(ui.tab === 'classes' ? normalizeClass(copy) : copy);
}
function deleteEntry(e) {
  const used = ui.tab === 'schools' ? spellsInSchool(e.name).length : 0;
  const extra = used ? `\n\n${used} spell(s) use this school and will be left with an unknown school.` : '';
  if (!confirm(`Delete "${e.name}"? This cannot be undone (unless you have a JSON backup).${extra}`)) return;
  db[ui.tab] = db[ui.tab].filter((x) => x.id !== e.id);
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

function changeClassKind(c, kind) {
  const newMax = maxLevel(kind);
  const lost = c.nodes.slice(newMax).filter((n) => n.name || n.description || n.isFractured || n.isAugment);
  if (lost.length && !confirm(`Switching to ${CLASS_KINDS[kind].label} keeps only ${newMax} levels. ${lost.length} filled-in node(s) above level ${newMax} will be removed. Continue?`)) {
    render();
    return;
  }
  c.kind = kind;
  const fixed = normalizeClass(c);
  c.nodes = fixed.nodes;
  touch();
  render();
}

function classCosts(c) {
  const s = db.settings.costs;
  const nodes = c.nodes.slice(0, maxLevel(c.kind));
  const out = {
    levels: nodes.length, base: nodes.length * s.classNode,
    augNodes: nodes.filter((n) => n.isAugment).length,
    fracturedNodes: nodes.filter((n) => n.isFractured).length,
    paths: 0, fractures: 0, masters: 0, fractureTotal: 0, pathCosts: [],
  };
  nodes.forEach((n) => {
    if (!n.isFractured) return;
    n.fracturePaths.forEach((p) => {
      const cost = pathCost(p);
      out.paths++;
      out.fractures += p.fractures.length;
      if (p.master) out.masters++;
      out.fractureTotal += cost;
      out.pathCosts.push({ level: n.level, node: n.name, path: p.name, cost });
    });
  });
  return out;
}
const fractureCost = (i) => (i === 0 ? db.settings.costs.firstFracture : db.settings.costs.additionalFracture);
function pathCost(p) {
  let cost = p.fractures.reduce((sum, _, i) => sum + fractureCost(i), 0);
  if (p.master) cost += db.settings.costs.masterFracture;
  return cost;
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
      field('Class name', c, 'name', { onInput: () => { renderList(); document.querySelector('.editor-head h1').textContent = c.name || '(unnamed)'; } }),
      h('label', { class: 'field' }, h('span', {}, 'Class type'), kindSel)),
    field('Summary (one line)', c, 'summary', { placeholder: 'A short pitch for the class' }),
    field('Description / fantasy', c, 'description', { type: 'textarea', rows: 4 }),
  ));

  // --- Augmentations
  const augSec = h('div', { class: 'section' },
    h('h2', {}, 'Augmentations', h('span', { class: 'spacer' }),
      h('button', { class: 'small', onclick: () => { c.augmentations.push({ id: uid(), name: '', philosophy: '' }); touch(); render(); } }, '+ Add Augmentation')),
    h('p', { class: 'hint' }, 'A fundamental change in the practitioner\'s philosophy. A player picks at most one, permanently. On Augmentation nodes they take either the default node or their Augmentation\'s variant.'));
  if (!c.augmentations.length) augSec.append(h('p', { class: 'muted' }, 'No augmentations yet.'));
  c.augmentations.forEach((a, i) => {
    augSec.append(h('div', { class: 'subcard aug' },
      h('div', { class: 'subcard-head' }, h('strong', {}, `Augmentation ${i + 1}`),
        h('button', { class: 'small danger', onclick: () => removeAugmentation(c, a) }, 'Remove')),
      field('Name', a, 'name', { onInput: () => refreshNodeSummaries() }),
      field('Philosophy / what changes', a, 'philosophy', { type: 'textarea' })));
  });
  wrap.append(augSec);

  // --- Ascendancy costs
  wrap.append(renderCostSection(c));

  // --- Nodes
  const nodesSec = h('div', { class: 'section' },
    h('h2', {}, `Class Nodes (Levels 1–${maxLevel(c.kind)})`, h('span', { class: 'spacer' }),
      h('button', { class: 'small', onclick: () => { c.nodes.forEach((n) => ui.open.add(nodeKey(c, n))); render(); } }, 'Expand all'),
      h('button', { class: 'small', onclick: () => { c.nodes.forEach((n) => ui.open.delete(nodeKey(c, n))); render(); } }, 'Collapse all')),
    c.kind === 'noncombat' ? h('p', { class: 'hint' }, 'Non-combat class: attack node types are hidden.') : null);
  c.nodes.slice(0, maxLevel(c.kind)).forEach((n) => nodesSec.append(renderNode(c, n)));
  wrap.append(nodesSec);

  wrap.append(h('div', { class: 'section' }, h('h2', {}, 'Designer Notes'),
    field('', c, 'notes', { type: 'textarea', rows: 4, placeholder: 'Balance notes, ideas, TODOs… (included in exports)' })));
  return wrap;
}

function removeAugmentation(c, a) {
  if (!confirm(`Remove augmentation "${a.name || 'unnamed'}"? Its variants on every node are removed too.`)) return;
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
    h('h2', {}, 'Ascendancy Points'),
    h('p', { class: 'hint' }, `Class & Augmentation nodes: ${fmt(s.classNode)} each · Fractures: ${fmt(s.firstFracture)} for the first on a path, ${fmt(s.additionalFracture)} for each additional · Master Fracture: ${fmt(s.masterFracture)} (editable in Settings).`),
    h('div', { class: 'cost-grid' },
      tile(fmt(k.base), `All ${k.levels} class nodes`),
      tile(k.augNodes, 'Augmentation nodes'),
      tile(k.fracturedNodes, 'Fractured nodes'),
      tile(`${k.paths} / ${k.fractures} / ${k.masters}`, 'Paths / fractures / masters'),
      tile(fmt(k.fractureTotal), 'All fracture paths combined'),
      tile(fmt(k.base + k.fractureTotal), 'Everything in this class')));
}

const nodeKey = (c, n) => `${c.id}:node:${n.level}`;

function nodeSummary(c, n) {
  const types = nodeTypesFor(c.kind);
  const bits = [
    h('span', { class: 'lvl' }, `Lv ${n.level}`),
    h('span', { class: 'node-title' + (n.name ? '' : ' empty') }, n.name || 'Unnamed node'),
  ];
  if (n.type) bits.push(h('span', { class: 'badge type' }, n.type));
  if (n.type && !types.includes(n.type)) bits.push(h('span', { class: 'badge warn', title: 'This type is not allowed for this class type' }, '⚠ type'));
  if (n.isAugment) bits.push(h('span', { class: 'badge aug' }, `Augment ×${n.augments.filter((v) => c.augmentations.some((a) => a.id === v.augId)).length}`));
  if (n.isFractured) bits.push(h('span', { class: 'badge frac' }, `Fractured · ${n.fracturePaths.length} path(s)`));
  if (n.isFractured && n.fracturePaths.some((p) => p.master)) bits.push(h('span', { class: 'badge cost' }, '★ Master'));
  if (n.isFractured && n.fracturePaths.filter((p) => p.master).length > 1) bits.push(h('span', { class: 'badge warn' }, '⚠ >1 master'));
  if (n.isAugment && n.isFractured) bits.push(h('span', { class: 'badge warn' }, '⚠ augment + fractured'));
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
    field('Description / mechanics', n, 'description', { type: 'textarea', rows: 3 }),
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
      body.append(h('p', { class: 'hint' }, 'This class has no Augmentations yet — add one above to write its variant here.'));
    }
    c.augmentations.forEach((a) => {
      let v = n.augments.find((x) => x.augId === a.id);
      if (!v) { v = { augId: a.id, name: '', type: n.type, description: '' }; n.augments.push(v); }
      body.append(h('div', { class: 'subcard aug' },
        h('div', { class: 'subcard-head' }, h('strong', {}, `Augmentation variant: ${a.name || 'unnamed augmentation'}`),
          h('span', { class: 'badge cost' }, `${fmt(db.settings.costs.augmentNode)} Asc`)),
        h('div', { class: 'row' },
          field('Variant name', v, 'name'),
          field('Variant type', v, 'type', { type: 'select', options: types })),
        field('Variant description / mechanics', v, 'description', { type: 'textarea' })));
    });
  }

  // Fracture paths
  if (n.isFractured) {
    body.append(h('p', { class: 'hint', style: 'margin-top:8px' }, 'A fractured node can have several paths, but only one Master Fracture across all of them.'));
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
      h('button', { class: 'small danger', onclick: () => { if (confirm('Remove this fracture path?')) { n.fracturePaths.splice(pi, 1); touch(); render(); } } }, 'Remove path')),
    h('div', { class: 'row' }, field('Path name', p, 'name'), field('Path theme', p, 'description', { placeholder: 'How this path modifies the node' })));

  p.fractures.forEach((f, fi) => {
    card.append(h('div', { class: 'subcard' },
      h('div', { class: 'subcard-head' },
        h('strong', {}, `Fracture ${fi + 1}`),
        h('span', { class: 'badge cost' }, `${fmt(fractureCost(fi))} Asc`),
        h('button', { class: 'small', onclick: () => { moveInArray(p.fractures, fi, -1); touch(); render(); } }, '↑'),
        h('button', { class: 'small', onclick: () => { moveInArray(p.fractures, fi, 1); touch(); render(); } }, '↓'),
        h('button', { class: 'small danger', onclick: () => { p.fractures.splice(fi, 1); touch(); render(); } }, 'Remove')),
      field('Fracture name', f, 'name'),
      field('What it adds / changes', f, 'description', { type: 'textarea', rows: 2 })));
  });
  const btns = h('div', { class: 'row' },
    h('button', { class: 'small', onclick: () => { p.fractures.push(newFracture()); touch(); render(); } }, '+ Add fracture'));
  const masterElsewhere = n.fracturePaths.find((x) => x !== p && x.master);
  if (!p.master && !masterElsewhere) btns.append(h('button', { class: 'small', onclick: () => { p.master = { name: '', description: '' }; touch(); render(); } }, '★ Add Master Fracture'));
  else if (!p.master) btns.append(h('span', { class: 'muted' }, `★ This node's Master Fracture is on "${masterElsewhere.name || 'another path'}".`));
  card.append(btns);

  if (p.master) {
    card.append(h('div', { class: 'subcard master', style: 'margin-top:10px' },
      h('div', { class: 'subcard-head' },
        h('strong', {}, '★ Master Fracture'),
        h('span', { class: 'badge cost' }, `${fmt(db.settings.costs.masterFracture)} Asc`),
        h('button', { class: 'small danger', onclick: () => { p.master = null; touch(); render(); } }, 'Remove')),
      field('Master fracture name', p.master, 'name'),
      field('Fundamental change', p.master, 'description', { type: 'textarea', rows: 3 })));
  }
  return card;
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
      field('Attack attribute', it, 'attackAttribute', { type: 'select', options: ATTACK_ATTRIBUTES, blank: false, onInput: renderList })),
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
function namedList(title, hint, arr, labels, cls = '') {
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
    field(labels[1], t, 'description', { type: 'textarea', rows: 3 }))));
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
  return h('div', { style: 'max-width:900px' },
    h('div', { class: 'editor-head' }, h('h1', {}, 'Settings')),
    h('div', { class: 'section' },
      h('h2', {}, 'Lists'),
      h('p', { class: 'hint' }, 'One entry per line. These fill the dropdowns throughout the app.'),
      h('div', { class: 'row' },
        listEditor('Class node types', 'nodeTypes'),
        listEditor('Attack node types', 'attackNodeTypes', 'Hidden on Non-Combat classes.')),
      h('div', { class: 'row' },
        listEditor('Item action types', 'itemActionTypes'),
        h('div', { class: 'field' }, h('span', {}, 'Schools of magic'), h('small', { class: 'muted' }, 'Schools are now edited in the Schools tab.')))),
    h('div', { class: 'section' },
      h('h2', {}, 'Ascendancy Point Costs'),
      h('div', { class: 'row' },
        field('Class node', costs, 'classNode', { type: 'number' }),
        field('Augmentation node', costs, 'augmentNode', { type: 'number' }),
        field('First fracture on a path', costs, 'firstFracture', { type: 'number' }),
        field('Each additional fracture', costs, 'additionalFracture', { type: 'number' }),
        field('Master fracture', costs, 'masterFracture', { type: 'number' }))),
    h('div', { class: 'section' },
      h('h2', {}, 'Data'),
      h('p', { class: 'hint' }, `Everything is stored in this browser. Export JSON regularly as a backup — clearing browser data deletes it. Currently: ${db.classes.length} classes, ${db.items.length} items, ${db.spells.length} spells, ${db.schools.length} schools.`),
      h('div', { class: 'row' },
        h('button', { onclick: () => { if (confirm('Add the example class, item and spell?')) { const ex = exampleDb(); db.classes.push(...ex.classes); db.items.push(...ex.items); db.spells.push(...ex.spells); save(); render(); } } }, 'Add examples'),
        h('button', { class: 'danger', onclick: resetAll }, 'Delete ALL data'))));
}

function resetAll() {
  if (!confirm('Delete ALL classes, items and spells? Export a JSON backup first if unsure.')) return;
  if (!confirm('Really delete everything?')) return;
  db = emptyDb();
  ui.selected = { classes: null, items: null, spells: null, schools: OVERVIEW_ID };
  save();
  render();
}

/* ======================================================================
 * Markdown export + tiny renderer for previews
 * ==================================================================== */

const indent = (t) => String(t || '').split('\n').filter((l) => l.trim()).join('\n  ');
const para = (t) => (t && t.trim() ? t.trim() + '\n' : '');

function classToMd(c) {
  const out = [];
  const k = classCosts(c);
  out.push(`# ${c.name}`, `*${CLASS_KINDS[c.kind].label} · ${maxLevel(c.kind)} Levels*`, '');
  if (c.summary) out.push(`**${c.summary}**`, '');
  if (c.description) out.push(para(c.description));

  if (c.augmentations.length) {
    out.push('## Augmentations', '');
    c.augmentations.forEach((a) => out.push(`### ${a.name || 'Unnamed Augmentation'}`, para(a.philosophy)));
  }

  out.push('## Class Nodes', '');
  c.nodes.slice(0, maxLevel(c.kind)).forEach((n) => {
    const tags = [n.isAugment ? 'Augmentation Node' : '', n.isFractured ? 'Fractured Node' : ''].filter(Boolean);
    out.push(`### Level ${n.level} — ${n.name || 'Unnamed'}${n.type ? ` *(${n.type})*` : ''}${tags.length ? ` · [${tags.join(', ')}]` : ''}`);
    if (n.description) out.push(n.description.trim());
    out.push('');
    if (n.isAugment) {
      c.augmentations.forEach((a) => {
        const v = n.augments.find((x) => x.augId === a.id);
        if (!v || !(v.name || v.description)) return;
        out.push(`> **${a.name || 'Augmentation'} variant: ${v.name || 'Unnamed'}**${v.type ? ` *(${v.type})*` : ''} — ${indent(v.description).replace(/\n {2}/g, ' ')}`, '');
      });
    }
    if (n.isFractured) {
      n.fracturePaths.forEach((p) => {
        out.push(`#### Fracture Path: ${p.name || 'Unnamed'} (${fmt(pathCost(p))} Asc)`);
        if (p.description) out.push(`*${p.description.trim()}*`);
        out.push('');
        p.fractures.forEach((f, i) => out.push(`- **${i + 1}. ${f.name || 'Unnamed'}** (${fmt(fractureCost(i))} Asc) — ${indent(f.description)}`));
        if (p.master) out.push(`- **★ Master: ${p.master.name || 'Unnamed'}** (${fmt(db.settings.costs.masterFracture)} Asc) — ${indent(p.master.description)}`);
        out.push('');
      });
    }
  });

  out.push('## Ascendancy Summary', '',
    `- All ${k.levels} class nodes: ${fmt(k.base)} Asc`,
    `- Augmentation nodes: ${k.augNodes}`,
    `- Fractured nodes: ${k.fracturedNodes} (${k.paths} paths, ${k.fractures} fractures, ${k.masters} master fractures)`,
    `- All fracture paths combined: ${fmt(k.fractureTotal)} Asc`,
    `- Everything: ${fmt(k.base + k.fractureTotal)} Asc`, '');
  if (c.notes) out.push('## Designer Notes', '', para(c.notes));
  return out.join('\n');
}

function itemToMd(it) {
  const out = [`# ${it.name}`, `*Attack Attribute: ${it.attackAttribute || '—'}*`, ''];
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
  return spellToMd(e);
}

function allToMarkdown() {
  const byName = (a, b) => (a.name || '').localeCompare(b.name || '');
  const demote = (md) => md.replace(/^(#{1,3}) /gm, '#$1 ');
  const parts = ['# RPG Design Forge Export', `*Exported ${new Date().toLocaleString()}*`, ''];
  const ov = db.lore.magicOverview;
  if (ov.text) parts.push(`# ${ov.title || 'Magic Overview'}`, '', para(ov.text));
  [['Classes', 'classes'], ['Items', 'items'], ['Schools of Magic', 'schools'], ['Spells', 'spells']].forEach(([title, key]) => {
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
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>');
}
function mdToHtml(md) {
  let html = '';
  let inList = false;
  let paraLines = [];
  const flush = () => { if (paraLines.length) { html += '<p>' + paraLines.map(inlineMd).join('<br>') + '</p>'; paraLines = []; } };
  const closeList = () => { if (inList) { html += '</li></ul>'; inList = false; } };
  for (const line of md.split('\n')) {
    let m;
    if (!line.trim()) { flush(); closeList(); continue; }
    if (line.trim() === '---') { flush(); closeList(); html += '<hr>'; continue; }
    if ((m = line.match(/^(#{1,6})\s+(.*)$/))) { flush(); closeList(); const l = Math.min(m[1].length, 6); html += `<h${l}>${inlineMd(m[2])}</h${l}>`; continue; }
    if ((m = line.match(/^- (.*)$/))) { flush(); html += inList ? '</li><li>' : '<ul><li>'; inList = true; html += inlineMd(m[1]); continue; }
    if (inList && /^ {2}\S/.test(line)) { html += '<br>' + inlineMd(line.trim()); continue; }
    if ((m = line.match(/^> ?(.*)$/))) { flush(); closeList(); html += `<blockquote>${inlineMd(m[1])}</blockquote>`; continue; }
    closeList();
    paraLines.push(line);
  }
  flush();
  closeList();
  return html;
}

/* ======================================================================
 * Import / export / clipboard
 * ==================================================================== */

const slug = (s) => (s || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled';

function download(filename, text, mime = 'text/plain') {
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
    prompt('Copy this text:', text);
  }
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const incoming = normalizeDb(JSON.parse(reader.result));
      const counts = { classes: 0, items: 0, spells: 0, schools: 0 };
      ['classes', 'items', 'spells', 'schools'].forEach((key) => {
        incoming[key].forEach((e) => {
          const idx = db[key].findIndex((x) => x.id === e.id);
          if (idx >= 0) db[key][idx] = e; else db[key].push(e);
          counts[key]++;
        });
      });
      if (confirm('Also replace your Settings (lists & costs) and Magic Overview with the ones from this file?')) { db.settings = incoming.settings; db.lore = incoming.lore; }
      save();
      render();
      alert(`Imported ${counts.classes} classes, ${counts.items} items, ${counts.spells} spells, ${counts.schools} schools. Entries with matching IDs were overwritten.`);
    } catch (e) {
      alert('That file could not be read as RPG Design Forge JSON.\n\n' + e.message);
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
['classes', 'items', 'spells'].forEach((k) => { if (db[k][0]) ui.selected[k] = db[k][0].id; });
save();
render();
