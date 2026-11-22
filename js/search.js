/* Search: exact + "vague" (fuzzy) matching.
 *
 * Each entry is described by weighted text fields, e.g. [[name, 3], [text, 1]].
 * A query is split into words (common filler words dropped, simple word endings
 * stripped). Every query word is compared against every word in the entry:
 *   exact word ............ 1.0
 *   prefix ("grap"→"grapple") 0.85
 *   typo / close spelling .. up to ~0.8 (edit distance)
 * The best hit per query word is weighted by field and averaged, so an entry
 * that matches more of the query ranks higher. Entries whose text contains the
 * whole query, or every query word, are "matches"; the rest above a threshold
 * are "similar".
 */
'use strict';

const STOPWORDS = new Set(('a an the of to and or in on at for with by is are be do does did how what when who '
  + 'can i my me you your it its this that these those if then than as from into about which per').split(' '));

function normText(s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Very light stemmer: "attacks"→"attack", "grappled"→"grappl", "casting"→"cast". */
function stem(w) {
  if (w.length <= 4) return w;
  for (const suf of ['ingly', 'edly', 'ing', 'ies', 'ed', 'es', 's', 'ly']) {
    if (w.endsWith(suf) && w.length - suf.length >= 3) return suf === 'ies' ? w.slice(0, -3) + 'y' : w.slice(0, -suf.length);
  }
  return w;
}

function tokenize(s, keepStop = false) {
  return normText(s).split(' ').filter((w) => w && (keepStop || !STOPWORDS.has(w))).map(stem);
}

/** Edit distance (Damerau: a swapped pair of letters counts as one typo), early exit past `max`. */
function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2 = null;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length];
}

function wordSimilarity(q, w) {
  if (q === w) return 1;
  if (q.length >= 3 && w.startsWith(q)) return 0.85;
  if (w.length >= 4 && q.startsWith(w)) return 0.75;
  if (q.length < 4) return 0;
  const max = q.length >= 10 ? 3 : q.length >= 7 ? 2 : 1;
  const d = editDistance(q, w, max);
  if (d > max) return 0;
  return 0.8 - (d - 1) * 0.12;
}

const _indexCache = new Map();

/** Build (and cache) the word index for an entry. */
function indexEntry(entry, fieldsFn) {
  const key = entry.id + ':' + (entry.updated || 0);
  const hit = _indexCache.get(entry.id);
  if (hit && hit.key === key) return hit;
  const fields = fieldsFn(entry).map(([text, weight]) => ({
    weight, raw: normText(text), words: Array.from(new Set(tokenize(text, true))),
  }));
  const rec = { key, fields };
  _indexCache.set(entry.id, rec);
  return rec;
}

/**
 * @returns {{matches: Array<{entry, score}>, similar: Array<{entry, score}>}}
 */
function searchEntries(entries, query, fieldsFn, { threshold = 0.3 } = {}) {
  const phrase = normText(query);
  let qWords = tokenize(query);
  if (!qWords.length) qWords = tokenize(query, true); // query was all filler words
  if (!phrase) return { matches: entries.map((entry) => ({ entry, score: 0 })), similar: [] };

  const maxWeight = 3;
  const matches = [];
  const similar = [];
  for (const entry of entries) {
    const idx = indexEntry(entry, fieldsFn);
    const phraseHit = idx.fields.some((f) => f.raw.includes(phrase));
    let total = 0;
    let allExact = true;
    for (const q of qWords) {
      let best = 0;
      let exact = false;
      for (const f of idx.fields) {
        for (const w of f.words) {
          const sim = wordSimilarity(q, w);
          if (sim >= 0.85) exact = true;
          const v = sim * (0.5 + 0.5 * f.weight / maxWeight);
          if (v > best) best = v;
        }
      }
      if (!exact) allExact = false;
      total += best;
    }
    let score = total / qWords.length;
    if (phraseHit) score += 0.5;
    if (idx.fields[0] && idx.fields[0].raw.includes(phrase)) score += 0.5; // phrase in the name
    if (phraseHit || allExact) matches.push({ entry, score });
    else if (score >= threshold) similar.push({ entry, score });
  }
  const byScore = (a, b) => b.score - a.score;
  return { matches: matches.sort(byScore), similar: similar.sort(byScore).slice(0, 15) };
}

/** Best single fuzzy match for a name (used for [[Rule Name]] links). */
function bestMatch(entries, query, fieldsFn) {
  const r = searchEntries(entries, query, fieldsFn);
  return (r.matches[0] || r.similar[0] || {}).entry || null;
}

/** Short excerpt around the first query word found in `text`. */
function snippet(text, query, len = 90) {
  const t = String(text || '').replace(/\*\*|\[\[|\]\]/g, '').replace(/^\s*- /gm, '• ').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const lower = t.toLowerCase();
  const words = normText(query).split(' ').filter((w) => w.length > 2);
  let at = -1;
  for (const w of words) {
    for (const cand of [w, stem(w)]) { at = lower.indexOf(cand); if (at >= 0) break; }
    if (at >= 0) break;
  }
  if (at < 0) return t.length > len ? t.slice(0, len) + '…' : t;
  const start = Math.max(0, at - 30);
  return (start > 0 ? '…' : '') + t.slice(start, start + len) + (start + len < t.length ? '…' : '');
}
