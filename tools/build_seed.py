#!/usr/bin/env python3
"""Build js/aoe-data.js (the AOE starter content) from the design notes in notes/.

Run from the repo root:  python3 tools/build_seed.py

The notes are the human-readable source; this script parses them into the
JSON structure the app uses (classes, rules, weapons, weapon traits, modules).
IDs are deterministic, so re-importing from Settings overwrites the same entries.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NOTES = ROOT / 'notes'
OUT = ROOT / 'js' / 'aoe-data.js'


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-') or 'x'


def read(name):
    return (NOTES / name).read_text(encoding='utf-8')


def strip_block(lines):
    while lines and not lines[0].strip():
        lines = lines[1:]
    while lines and not lines[-1].strip():
        lines = lines[:-1]
    return lines


def unwrap(lines):
    """Undo the ~105-column hard wrapping used when the notes were saved."""
    out = []
    for l in lines:
        s = l.strip()
        prev = out[-1] if out else ''
        starts_block = (not s or s.startswith(('-', '|', '#', '>', '**', '¤')) or re.match(r'^\d+\.', s))
        prev_is_bullet = prev.strip().startswith(('-', '•'))
        cont_ok = (not prev_is_bullet) or l.startswith((' ', '\t'))
        if out and prev.strip() and not starts_block and cont_ok and len(prev) >= 88 and not prev.rstrip().endswith(':'):
            out[-1] = prev.rstrip() + ' ' + s
        else:
            out.append(l)
    return out


def text(lines):
    return '\n'.join(strip_block(unwrap(list(lines)))).strip()


def sections(src, level):
    """Split markdown into [(heading, body_lines)] at a given heading level."""
    mark = '#' * level + ' '
    out, head, body = [], None, []
    for line in src.split('\n'):
        if line.startswith(mark):
            out.append((head, body))
            head, body = line[len(mark):].strip(), []
        else:
            body.append(line)
    out.append((head, body))
    return out


ARROW = re.compile(r'\s*←\s*(.*)$')


def pull_notes(lines):
    """Remove my '← remark' annotations from lines; return (clean_lines, remarks)."""
    clean, remarks = [], []
    for l in lines:
        m = ARROW.search(l)
        if m:
            remarks.append(m.group(1).strip())
            l = l[:m.start()]
        clean.append(l)
    return clean, remarks


COST_RE = re.compile(
    r'^(?:\d+\s*(?:AP|BP|RP|CaP|CP|OP)\b|\d+\+?\s*Chakra|Passive$|Reaction\b|Once [Pp]er|Twice per|Cooldown|Cool [Dd]own|'
    r'Variable$|Cost:|Base Effect|Free Action)', re.I)


def is_italic(l):
    s = l.strip()
    return len(s) > 2 and s.startswith('*') and s.endswith('*') and not s.startswith('**')


def is_cost(l):
    l = l.strip()
    return bool(COST_RE.match(l)) and len(l) < 45 and ', ' not in l and not l.endswith(':')


def join_italics(lines):
    """Merge an italic sentence that wraps across several lines into one line."""
    out, buf = [], None
    for l in lines:
        s = l.strip()
        if buf is not None:
            buf += ' ' + s
            if s.endswith('*'):
                out.append(buf)
                buf = None
            continue
        if s.startswith('*') and not s.startswith('**') and not s.endswith('*') and len(s) > 1:
            buf = s
            continue
        out.append(l)
    if buf is not None:
        out.append(buf)
    return out


def split_header(lines):
    """Pull flavor line(s) and cost/frequency line(s) from the top of a node body."""
    lines = strip_block(join_italics(lines))
    flavor, cost = [], []
    i = 0
    nonempty = [j for j, l in enumerate(lines) if l.strip()]
    while i < len(lines) and len(flavor) + len(cost) < 4:
        l = lines[i].strip()
        if not l:
            i += 1
            continue
        nxt = next((lines[j].strip() for j in nonempty if j > i), '')
        if l == 'NA':
            i += 1
            continue
        if is_italic(l) and not flavor:
            flavor.append(l.strip('*').strip())
        elif is_cost(l):
            cost.append(l)
        elif not flavor and not cost and (is_cost(nxt) or nxt == 'NA') and not l.startswith('-'):
            flavor.append(l)
        else:
            break
        i += 1
    return ' '.join(flavor), ' | '.join(cost), lines[i:]


GRANT_RE = re.compile(r'^(In [Aa]ddition|Additional Effect)\b[:,]?\s*(.*)$')


def split_grants(lines):
    body, grants, in_grant = [], [], False
    for l in lines:
        m = GRANT_RE.match(l.strip())
        if m:
            in_grant = True
            rest = m.group(2).strip()
            if rest and rest != ':':
                grants.append(rest)
            continue
        if in_grant and (l.lstrip().startswith('-') or l.startswith('  ')):
            grants.append(l)
            continue
        in_grant = False
        body.append(l)
    return body, text(grants)


def demote_subheads(lines):
    """Turn '#### Sub-ability' headings inside a node into bold lines."""
    out = []
    for l in lines:
        m = re.match(r'^#{4,6}\s+(.*)$', l)
        out.append(f'**{m.group(1).strip()}**' if m else l)
    return out


def infer_type(title_type, cost, name, desc):
    t = (title_type or '').replace(' Node', '').strip()
    if t:
        return t
    c = cost.lower()
    if 'passive' in c:
        return 'Passive'
    if c.startswith('reaction') or ' rp' in f' {c}' and 'reaction' in desc.lower()[:80]:
        return 'Reaction'
    if name.startswith('Divine Spellcasting'):
        return 'Spellcasting'
    if re.search(r'\b\d+\s*RP\b', cost) and 'AP' not in cost:
        return 'Reaction'
    if re.search(r'\b\d+\s*AP\b', cost):
        return 'Action'
    if re.search(r'\b\d+\s*BP\b', cost):
        return 'Bonus Action'
    return ''


# --------------------------------------------------------------------------- fractures

FRAC_HEAD = re.compile(r'^(#{3,5}) Fractal Path (\d+)(?:\s*—\s*(.*))?$')
COST_ASC = re.compile(r'Cost:\s*(\d+)\s*Ascension', re.I)


def tier_for(cost_num, label):
    if 'Greater' in label:
        return 'Greater'
    if 'Lesser' in label:
        return 'Lesser'
    return {0: 'Free', 250: 'Lesser', 500: 'Greater'}.get(cost_num, 'Lesser')


def fracture_from_block(fid, name_line, lines, full_name=False):
    """name_line may contain 'X — Cost: N Ascension' or just a name; lines = body."""
    cost_num = None
    m = COST_ASC.search(name_line)
    if m:
        cost_num = int(m.group(1))
        name_line = COST_ASC.sub('', name_line)
    body, cost_lines = [], []
    for l in lines:
        mm = COST_ASC.search(l)
        if mm and len(l.strip()) < 60:
            cost_num = int(mm.group(1))
            rest = COST_ASC.sub('', l).strip(' |—-')
            if rest:
                cost_lines.append(rest)
            continue
        if (COST_RE.match(l.strip()) and len(l.strip()) < 60 and not body
                and not l.strip().lower().startswith('reaction')):
            cost_lines.append(l.strip())
            continue
        body.append(l)
    label = name_line.strip(' —-')
    parts = [p.strip() for p in label.split(' — ') if p.strip()]
    name = ''
    for p in parts:
        mm = re.match(r'^(?:\(\d+\)\s*)?(Lesser|Greater) Fracture:\s*(.*)$', p)
        if mm:
            if not name:
                name = mm.group(2)
        elif not name:
            name = re.sub(r'^\(\d+\)\s*', '', p)
    if full_name:
        name = label
    tier = tier_for(cost_num if cost_num is not None else 250, label)
    body, remarks = pull_notes(body)
    return {'id': fid, 'name': name, 'tier': tier, 'cost': ' | '.join(cost_lines), 'requires': '',
            'description': text(body)}, remarks


def parse_fractures(prefix, lines):
    """lines start at the first 'Fractal Path' heading. Returns list of paths."""
    paths = {}
    order = []
    blocks = []  # (depth, pathnum, headname, body)
    cur = None
    for l in lines:
        m = FRAC_HEAD.match(l)
        if m:
            cur = [len(m.group(1)), int(m.group(2)), (m.group(3) or '').strip(), []]
            blocks.append(cur)
        elif cur is not None:
            cur[3].append(l)
    base_depth = min((b[0] for b in blocks), default=4)
    remarks = []
    for depth, num, head, body in blocks:
        if num not in paths:
            paths[num] = {'id': f'{prefix}-p{num}', 'name': '', 'description': '', 'fractures': []}
            order.append(num)
        p = paths[num]
        fl = p['fractures']
        if head:
            pname, fname = (head.split(':', 1) + [''])[:2] if ':' in head else ('', head)
            if pname and not p['name']:
                p['name'] = pname.strip()
            f, r = fracture_from_block(f'{prefix}-p{num}-f{len(fl) + 1}', (fname or head).strip(), body, True)
            remarks += r
            if depth > base_depth and fl:
                f['requires'] = fl[0]['id']
            elif fl:
                f['requires'] = fl[-1]['id']
            fl.append(f)
        else:
            # unnamed path heading: fractures start at lines containing "Cost: N Ascension"
            chunk = None
            for l in body:
                if COST_ASC.search(l) and len(l) < 120:
                    chunk = [l, []]
                    f_lines = chunk
                    fl.append(f_lines)
                elif chunk is not None:
                    chunk[1].append(l)
            built = []
            for item in fl:
                if isinstance(item, list):
                    f, r = fracture_from_block(f'{prefix}-p{num}-f{len(built) + 1}', item[0], item[1])
                    remarks += r
                    if built:
                        f['requires'] = built[-1]['id']
                    built.append(f)
                else:
                    built.append(item)
            p['fractures'] = built
    return [paths[n] for n in order], remarks


# --------------------------------------------------------------------------- classes

NODE_HEAD = re.compile(r'^(¤\s*)?(?:Level\s+)?(\d+)\s*[.–-]\s*(.*)$')


def parse_title(raw):
    flags = {'aug': False, 'frac': False, 'type': '', 'cost': '', 'marked': bool(raw.strip().startswith('¤'))}
    t = ARROW.sub('', raw).strip()
    m = NODE_HEAD.match(t)
    level, name = int(m.group(2)), m.group(3).strip()
    if '(AUG)' in name:
        flags['aug'] = True
        name = name.replace('(AUG)', '').strip()
    if re.search(r'\(?Fracture Node\)?', name) and 'Fracture Node' in name:
        flags['frac'] = True
        name = re.sub(r'\s*(—\s*)?\(?Fracture Node\)?', '', name).strip()
    m2 = re.match(r'^(.*?)\s+—\s+\*(.+)\*$', name)
    if m2:
        name, flags['type'] = m2.group(1).strip(), m2.group(2).strip()
    m3 = re.match(r'^(.*?)\s*\(([^)]*(?:AP|BP|RP|[Oo]nce|per)[^)]*)\)\s*$', name)
    if m3:
        name, flags['cost'] = m3.group(1).strip(), m3.group(2).strip()
    name = name.strip(' –-')
    return level, name, flags


def parse_class_file(fname, cls_id, cls_name):
    src = read(fname)
    src_lines = src.split('\n')
    cls = {'id': cls_id, 'name': cls_name, 'kind': 'combat', 'summary': '', 'identity': '',
           'resources': [], 'proficiencies': {'armor': '', 'weapons': '', 'tools': '', 'statFocus': ''},
           'augmentations': [], 'nodes': [], 'notes': f'Imported from design notes: notes/{fname}'}
    # level-2 sections
    for head, body in sections(src, 2):
        if not head:
            continue
        if head.startswith('Class Identity'):
            cls['identity'] = text(body)
            if 'To be replaced' in head:
                cls['notes'] += '\nClass Identity is marked "(To be replaced)" in the notes.'
        elif head.startswith('Base Resources'):
            for l in body:
                m = re.match(r'^- (.+?):\s*(.*)$', l)
                if m:
                    cls['resources'].append({'id': f'{cls_id}-res-{slug(m.group(1))}', 'name': m.group(1).strip(),
                                             'description': m.group(2).strip()})
                elif l.startswith('  ') and cls['resources']:
                    cls['resources'][-1]['description'] += ' ' + l.strip()
        elif head.startswith('Recommended Proficiencies'):
            keys = {'armor': 'armor', 'weapons': 'weapons', 'tool mastery': 'tools', 'stat focus': 'statFocus'}
            for l in body:
                m = re.match(r'^- (.+?):\s*(.*)$', l)
                if m and m.group(1).strip().lower() in keys:
                    cls['proficiencies'][keys[m.group(1).strip().lower()]] = m.group(2).strip()
    # nodes: every '### N.' / '### Level N' heading
    node_secs = [(h, b) for h, b in sections(src, 3) if h and NODE_HEAD.match(h.strip())]
    for head, body in node_secs:
        level, name, flags = parse_title(head)
        # stop body at next level-2 heading
        cut = next((i for i, l in enumerate(body) if l.startswith('## ')), len(body))
        body = body[:cut]
        frac_at = next((i for i, l in enumerate(body) if FRAC_HEAD.match(l)), None)
        main, frac_lines = (body[:frac_at], body[frac_at:]) if frac_at is not None else (body, [])
        main, remarks = pull_notes(main)
        flavor, cost, rest = split_header(main)
        if flags['cost']:
            cost = ' | '.join(x for x in [flags['cost'], cost] if x)
        rest, grants = split_grants(rest)
        desc = text(demote_subheads(rest))
        if desc in ('(empty)', '(no text)') or desc.startswith('(no mechanics given yet)'):
            remarks.append('No text in the notes yet.')
            desc = ''
        ntype = infer_type(flags['type'], cost, name, desc)
        if cost.strip().lower() == ntype.lower():
            cost = ''
        node = {'level': level, 'name': name, 'type': ntype,
                'flavor': flavor, 'cost': cost, 'description': desc, 'grants': grants, 'notes': '',
                'isAugment': flags['aug'], 'augments': [], 'isFractured': flags['frac'] or bool(frac_lines),
                'fracturePaths': []}
        if frac_lines:
            node['fracturePaths'], r = parse_fractures(f'{cls_id}-n{level}', frac_lines)
            remarks += r
        if flags['marked']:
            remarks.append('Marked with ¤ in the notes (possibly an Augmentation node).')
        node['notes'] = '\n'.join(remarks)
        cls['nodes'].append(node)
    cls['nodes'].sort(key=lambda n: n['level'])
    return cls


def add_aug(cls, name, philosophy):
    a = {'id': f"{cls['id']}-aug-{slug(name)}", 'name': name, 'philosophy': philosophy}
    cls['augmentations'].append(a)
    return a


def node(cls, level):
    return next(n for n in cls['nodes'] if n['level'] == level)


def variant(aug, n, **kw):
    v = {'augId': aug['id'], 'name': '', 'type': n['type'], 'tagline': '', 'cost': '', 'appearance': '',
         'description': '', 'flaw': '', 'quote': ''}
    v.update(kw)
    n['isAugment'] = True
    n['augments'].append(v)


def build_monk():
    cls = parse_class_file('incoming-02-monk.md', 'cls-monk', 'Monk')
    src = read('incoming-02-monk.md')
    trad = next(b for h, b in sections(src, 2) if h and h.startswith('Traditions'))
    for head, body in sections('\n'.join(trad), 3):
        if head:
            add_aug(cls, head, text(body))
    n1 = node(cls, 1)
    for head, body in sections(read('incoming-08-monk-augmentations.md'), 3):
        if not head:
            continue
        aug = next(a for a in cls['augmentations'] if head.startswith(a['name'][:12]))
        desc = text(body)
        extra = head[len(aug['name']):].strip()
        if extra:
            desc = f'*{extra.strip("()")}*\n\n' + desc
        m = re.search(r'\*\*(\w+ combo)\*\*', desc)
        variant(aug, n1, name=(m.group(1).title() if m else ''), description=desc)
    node(cls, 3)['notes'] = 'Marked (AUG) in the notes; tradition variants not written yet.'
    return cls


def build_warrior():
    cls = parse_class_file('incoming-03-warrior.md', 'cls-warrior', 'Warrior')
    # Newer fracture version for node 4 (part 11)
    p11 = read('incoming-11-warrior-fractures.md')
    lines = p11.split('\n')
    start = next(i for i, l in enumerate(lines) if FRAC_HEAD.match(l))
    n4 = node(cls, 4)
    n4['fracturePaths'], _ = parse_fractures('cls-warrior-n4', lines[start:])
    n4['notes'] = ('Fracture paths use the newer version from notes/incoming-11-warrior-fractures.md '
                   '(Brawn or Dexterity; per 5 ft; Absolute Wall cooldown 2 rounds). The older version is in part 3.')
    src = read('incoming-10-warrior-augmentations.md')
    for head2, body2 in sections(src, 2):
        if not head2 or not head2.startswith('Node'):
            continue
        level = int(re.match(r'Node (\d+)', head2).group(1))
        n = node(cls, level)
        for head, body in sections('\n'.join(body2), 3):
            if not head:
                continue
            aug_name = re.sub(r'^\(\d+\)\s*', '', head).strip()
            aug = next((a for a in cls['augmentations'] if a['name'] == aug_name), None)
            tagline, ability, desc, flaw, quote = '', '', [], '', ''
            in_flaw = False
            for l in body:
                s = l.strip()
                if in_flaw and l.startswith('  ') and s:
                    flaw += ' ' + s
                    continue
                in_flaw = False
                if is_italic(s) and not tagline:
                    tagline = s.strip('*')
                elif s.startswith('¤'):
                    ability = s.lstrip('¤ ').rstrip(':')
                elif s.startswith('- Flaw:'):
                    flaw = s[len('- Flaw:'):].strip()
                    in_flaw = True
                elif s.startswith('>'):
                    q = s.lstrip('> ').strip()
                    quote = '' if q.startswith('(no closing') else q
                else:
                    desc.append(l)
            if aug is None:
                aug = add_aug(cls, aug_name, tagline)
            variant(aug, n, name=ability, tagline=tagline, description=text(desc), flaw=flaw, quote=quote)
    node(cls, 2)['notes'] = 'Base text ends mid-sentence in the notes ("When you use your champions call with allies within your domain.").'
    node(cls, 6)['notes'] = 'Call Of The Champion text is identical to Call Of The Warrior (likely a placeholder).'
    return cls


def build_templar():
    cls = parse_class_file('incoming-05-templar.md', 'cls-templar', 'Templar')
    src = read('incoming-09-templar-aug-nox.md')
    aug = add_aug(cls, 'Nox', 'God of Redemption, Judgment, and Execution.')
    for head, body in sections(src, 3):
        if not head:
            continue
        level = int(re.match(r'(\d+)', head).group(1))
        n = node(cls, level)
        idx = next(i for i, l in enumerate(body) if l.startswith('**Ability:'))
        appearance = text(body[:idx])
        name = body[idx].strip('* ').replace('Ability:', '').strip()
        _, cost, rest = split_header(body[idx + 1:])
        variant(aug, n, name=name, cost=cost, appearance=appearance, description=text(rest),
                type=('Passive' if 'Passive' in cost else n['type']))
    for n in cls['nodes']:
        if n['isAugment'] and 'Reference Templar Augmentation List' in n['description']:
            n['notes'] = 'Base text points to the Templar Augmentation List; each graft-god gives a variant.'
    return cls


def build_executioner():
    cls = parse_class_file('incoming-12-executioner.md', 'cls-executioner', 'Executioner')
    n4 = node(cls, 4)
    if n4['name'].startswith('Trauma Trauma'):
        n4['name'] = 'Trauma'
        n4['notes'] = 'Name appears doubled in the notes ("Trauma Trauma").'
    n7 = node(cls, 7)
    n7['description'] = n7['description'].replace('(once per round).   ', '(once per round).').rstrip()
    return cls


def build_classes():
    simple = [
        ('incoming-04-scoundrel.md', 'cls-scoundrel', 'Scoundrel'),
        ('incoming-06-pathfinder.md', 'cls-pathfinder', 'Pathfinder'),
        ('incoming-07-priest.md', 'cls-priest', 'Priest'),
        ('incoming-13-scrapper.md', 'cls-scrapper', 'Scrapper'),
        ('incoming-14-mecha-tech.md', 'cls-mecha-tech', 'Mecha-Tech'),
        ('incoming-16-genomancer.md', 'cls-genomancer', 'Genomancer'),
    ]
    classes = [build_monk(), build_warrior()]
    classes += [parse_class_file(*a) for a in simple[:1]]
    classes.append(build_templar())
    classes += [parse_class_file(*a) for a in simple[1:3]]
    classes.append(build_executioner())
    classes += [parse_class_file(*a) for a in simple[3:]]
    return classes


# --------------------------------------------------------------------------- tables, traits, weapons, modules

def md_tables(src):
    """Yield (h2 heading, italic description, rows as list of dicts)."""
    for head, body in sections(src, 2):
        if not head:
            continue
        rows = [l for l in body if l.startswith('|')]
        if len(rows) < 3:
            continue
        cols = [c.strip() for c in rows[0].strip('|').split('|')]
        data = []
        for r in rows[2:]:
            cells = [c.strip() for c in r.strip().strip('|').split('|')]
            data.append(dict(zip(cols, cells)))
        desc = next((l.strip().strip('*') for l in body if is_italic(l)), '')
        if not desc:
            # multi-line italic description
            joined = ' '.join(l.strip() for l in body if l.strip() and not l.startswith('|'))
            m = re.match(r'^\*(.*?)\*', joined)
            desc = m.group(1) if m else ''
        yield head, desc, data


def build_traits():
    out = []
    for _, _, rows in md_tables(read('incoming-17-weapon-traits.md')):
        if 'Rarity' not in (rows[0] if rows else {}):
            continue
        for r in rows:
            out.append({'id': f"trait-{slug(r['Trait'])}", 'name': r['Trait'], 'rarity': r['Rarity'],
                        'effect': r['Effect'], 'notes': ''})
    return out


def build_weapons():
    out = {}
    groups = []
    for head, desc, rows in md_tables(read('incoming-18-weapons.md')):
        group = head.split('(')[0].strip()
        groups.append((group, head, desc))
        for r in rows:
            name = r['Weapon']
            ap = r.get('AP') or r.get('AP Cost', '')
            base = r.get('Base Damage') or r.get('Base', '')
            m = re.match(r'^(\d+)\s*(.*)$', base)
            dmg, dtype = (m.group(1), m.group(2)) if m else ('', base)
            prof = {'attackType': r['Attack Type'], 'ap': ap, 'damage': dmg, 'damageType': dtype,
                    'crit': r.get('Crit') or r.get('Crit Bonus', ''), 'epic': r.get('Epic') or r.get('Epic Bonus', ''),
                    'range': r.get('Range', '')}
            key = (group, name)
            talent = r['Specialized Talent'].strip('<>⟨⟩')
            if key not in out:
                out[key] = {'id': f'wpn-{slug(group)}-{slug(name)}', 'name': name, 'group': group, 'talents': [],
                            'description': '', 'profiles': [], 'notes': ''}
            w = out[key]
            if talent not in w['talents']:
                w['talents'].append(talent)
            w['profiles'].append(prof)
    weapons = list(out.values())
    for w in weapons:
        w['talent'] = w['talents'][0]
        if len(w['talents']) > 1:
            # talent differs by attack profile (e.g. Hand Axe, Scythe)
            for p, row_talent in zip(w['profiles'], w['talents'] * 2):
                pass
        del w['talents']
        if w['name'] == 'Great Club':
            w['notes'] = 'Great Club is listed in both One-Handed Versatile and Heavy Two-Handed with identical stats.'
        if w['talent'] == 'Damage Buff':
            w['notes'] = (w['notes'] + '\n' if w['notes'] else '') + '"Damage Buff" is not in the weapon traits list yet.'
        if any('–' in p['ap'] for p in w['profiles']):
            w['notes'] = (w['notes'] + '\n' if w['notes'] else '') + 'Ranged AP is written as "X–Y" in the notes; meaning not yet defined.'
    # per-profile talent where a weapon has two talents
    for head, desc, rows in md_tables(read('incoming-18-weapons.md')):
        group = head.split('(')[0].strip()
        for r in rows:
            w = out[(group, r['Weapon'])]
            for p in w['profiles']:
                if p['attackType'] == r['Attack Type']:
                    p['talent'] = r['Specialized Talent'].strip('<>⟨⟩')
    for w in weapons:
        if all(p.get('talent') == w['talent'] for p in w['profiles']):
            for p in w['profiles']:
                p.pop('talent', None)
    return weapons, groups


def build_modules():
    out = []
    for head2, body2 in sections(read('incoming-15-mechatech-modules.md'), 2):
        if not head2 or 'MODULES' not in head2:
            continue
        category = head2.split('(')[0].strip().title().replace('Modules', 'Module').strip()
        for head, body in sections('\n'.join(body2), 3):
            if not head:
                continue
            m = re.match(r'^(A?\d+)\.\s*(.*?)\s*—\s*Complexity \((\d+)\)', head)
            mod = {'id': f'mod-{slug(m.group(2))}', 'name': m.group(2), 'category': category,
                   'complexity': int(m.group(3)), 'visual': '', 'cost': '', 'effect': '', 'execution': '',
                   'scaling': '', 'notes': ''}
            for l in body:
                mm = re.match(r'^- (Visual|Activation / Cost|Effect|Attack|Execution|Ascension Scaling):\s*(.*)$', l)
                if mm:
                    k = {'Visual': 'visual', 'Activation / Cost': 'cost', 'Effect': 'effect', 'Attack': 'effect',
                         'Execution': 'execution', 'Ascension Scaling': 'scaling'}[mm.group(1)]
                    mod[k] = mm.group(2).strip()
            out.append(mod)
    return out


# --------------------------------------------------------------------------- rules

def rule(name, category, summary, txt, keywords='', related=()):
    return {'id': f'rule-{slug(name)}', 'name': name, 'category': category, 'summary': summary,
            'text': txt.strip(), 'keywords': keywords, 'related': list(related), 'notes': ''}


def build_rules(classes, weapon_groups):
    P = 'Character Progression'
    R = [
        rule('Node System Overview', P,
             'Classes are built from Core Nodes, with optional Specialization Fractures and Augmentation Paths.',
             """
AOE uses a **Node-Based Class Progression System**.
Each class is built from [[Core Nodes]], with optional [[Specialization Fractures]] and [[Augmentations|Augmentation Paths]] that allow players to deepen, customize, or philosophically reshape their class.

This system is designed to provide:
- Clear class identity
- Optional specialization without forced commitment
""", 'class tree, skill tree, progression, leveling, level up, build'),
        rule('Core Nodes', P, 'Every class has 20 Core Nodes taken in order, each costing 500 Ascension Points.', """
Core Nodes are the foundational structure of a class.
- Each class has 20 Core Nodes
- Core Nodes are taken in a straight 1–20 progression
- Each Core Node costs 500 [[Ascension Points]]
- Core Nodes represent the primary abilities, traits, and mechanics of the class

Core Nodes are the skeleton of the class. Everything else ([[Specialization Fractures|Fractures]] and [[Augmentations]]) builds off of them.

**New Player Note**
If you are new to tabletop role-playing games:
- Core Nodes are simply the main abilities your class gains as it grows
- You will always follow the Core Node path in order
- Even if you specialize or multiclass, Core Nodes are always the foundation
""", 'class node, class nodes, level, levels, level up, class level, 1-20, node'),
        rule('Multiclassing', P, 'You may multiclass; you always start at Core Node 1 of the new class.', """
Multiclassing is allowed in AOE.
- When you multiclass, you always begin at Core Node 1 of the new class
- You must progress through that class's [[Core Nodes]] in order
- Core Nodes are never skipped or rearranged
""", 'multiclass, multi-class, second class, dual class'),
        rule('Ascension Points', P, 'Characters grow by earning Ascension Points and spending them on nodes.', """
Players gain **Ascension Points**, a measure of growing power (similar to experience). Points are spent to unlock nodes:

| Node | Cost |
|---|---|
| [[Core Nodes|Core Node]] | 500 |
| [[Augmentations|Augmentation Node]] | 0 |
| Free Fracture (first node of a fracture path) | 0 |
| Lesser Fracture | 250 |
| Greater Fracture | 500 |

Some abilities scale with your total **Ascension Score** (e.g. "+1 per 2,500 Ascension Score").
""", 'exp, xp, experience, level up, leveling, advancement, power scaling, cost, spend, ascension score, ascendancy'),
        rule('Specialization Fractures', P, 'Optional mini skill trees that deepen a specific Core Node.', """
Some [[Core Nodes]] have Specialization Fractures attached to them.
A Fracture allows a player to deepen and specialize a specific Core Node, turning it into a defining part of their character.

**General Rules**
- Fractures are optional
- Not every Core Node has a fracture
- Fractures branch off a specific Core Node
- A player is never required to take a fracture

**Free Fracture Node**
- The first node of any fracture path is always free
- Free fracture nodes are designed to be low-commitment and exploratory

**Lesser Fractures** ("I care about this.")
- Cost: 250 [[Ascension Points]]
- Represent refinement, reinforcement, or incremental improvement
- Enhance how the Core Node functions without redefining the node
- All nodes directly attached to the first fracture node are always Lesser Fractures

**Greater Fractures** ("This defines my character.")
- Cost: 500 Ascension Points
- Represent a deep commitment to the specialization
- Fundamentally alter or strongly define how the Core Node behaves

**Fracture Role**
- Fracture paths are designed to allow exploration before commitment

This prevents accidental or forced identity lock-in. See also [[Fracture Flexibility]].
""", 'fracture, fractures, fractured node, fracture path, lesser, greater, master fracture, branch, tree, upgrade, specialization'),
        rule('Fracture Flexibility', 'AG Discretion', 'With Adventure Guide approval, a player may reselect fracture choices.', """
While fractures represent character commitment, flexibility is encouraged.
- With [[Adventure Guide]] approval, a player may reselect fracture choices
- This is intended to support fun, experimentation, and long-term enjoyment
- The system is not meant to punish players for exploring mechanics
""", 'respec, reselect, retrain fracture, change fracture'),
        rule('Augmentations', P, 'Augmentation Paths are exclusive philosophical approaches that reshape certain Core Nodes.', """
Some [[Core Nodes]] are marked as **Augmentation Nodes**. Augmentations represent philosophical approaches to how a class functions.

**General Rules**
- Augmentation Nodes cost 0 [[Ascension Points]]
- Each class has one or more Augmentation Paths
- Augmentations are class-specific
- Once an Augmentation Path is chosen, you cannot mix paths

**Choosing an Augmentation Path**
- When you augment a node, you select one Augmentation Path for your class
- Once selected, you are locked into that path
- You may only use augmentations from that chosen path

**Important Notes**
- You do not need to augment every eligible node
- Augmentations are optional on a per-node basis
- Augmenting a node fundamentally changes how it works

Augmentations do not add power sideways—they reshape behavior. See also [[Augmentation Flexibility]].
""", 'augment, augmentation node, augmentation path, philosophy, variant, subclass, tradition, sin, graft'),
        rule('Augmentation Flexibility', 'AG Discretion', 'With Adventure Guide approval, a player may switch Augmentation Path.', """
Although augmentation paths are exclusive, flexibility is encouraged.
- With [[Adventure Guide]] approval, a player may switch to a different Augmentation Path
- This represents retraining, character growth, or narrative change
- The goal is to ensure players are not locked into something that is no longer fun
""", 'switch augmentation, change path, retrain, respec'),
        rule('Base Resources', 'Core Rules', 'Action Points, Reaction Points and Bonus Points.', """
- **Action Points (AP):** Standard class progression.
- **Reaction Points (RP):** Used primarily for defensive maneuvers, grapples, collision control, and momentum-based reactions.
- **Bonus Points (BP):** Fuel explosive movement, jumps, improvised techniques, and high-risk physical exertion.

Some classes add their own resources, such as Combo (Monk), Chakra (Templar), Critical Actions (Scoundrel), Overdrive and Integrity (Mecha-Tech).
""", 'ap, rp, bp, action points, reaction points, bonus points, resources, economy'),
        rule('Attack Types', 'Combat', 'Which stat an attack uses: Graceful, Charm/PSI, Might, Keen, Athose, Heft, Finesse.', """
| Attack type | Stat |
|---|---|
| Graceful | Dexterity |
| Charm/PSI | Charisma |
| Might | Strength |
| Keen | Wittiness |
| Athose | Intelligence |
| Heft | Half Strength + Half Wittiness |
| Finesse | Half Dexterity + Half Wittiness |
""", 'attack attribute, attack stat, stat, ability score, modifier, strength, dexterity, wittiness, wittyness, intelligence, charisma, psi, grace'),
        rule('Advantage and Disadvantage', 'Combat', 'Advantage comes in steps: Small (+1d4), Medium (+1d6), and larger.', """
| Step | Bonus |
|---|---|
| Small Advantage / Disadvantage | +1d4 / −1d4 |
| Medium Advantage / Disadvantage | +1d6 / −1d6 |
| (next step) | +1d8 |

The +1d8 step appears on the Predictive Combat Lattice module. "True advantage" also appears (Priest node 20) but is not yet defined.
""", 'small advantage, medium advantage, disadvantage, d4, d6, d8, bonus die'),
        rule('Adventure Guide', 'Glossary', 'The Adventure Guide (AG) is the game master.', """
The **Adventure Guide (AG)** runs the game (the game master). Several rules allow flexibility at AG discretion, such as [[Fracture Flexibility]] and [[Augmentation Flexibility]].
""", 'ag, gm, game master, dm, dungeon master'),
    ]
    # Weapon groups
    rows = '\n'.join(f'| {g} | {d} |' for g, _, d in weapon_groups)
    R.append(rule('Weapon Groups', 'Items', 'The families of weapons and how they play.',
                  f'| Group | Description |\n|---|---|\n{rows}', 'weapon type, weapon category, light, heavy, polearm, ranged, harmony, solar, exotic'))
    # Conditions (from Pathfinder node 17)
    conds = [
        ('Vulnerable', 'Set easily prone to illness or effects; All resist saves are made with a small disadvantage'),
        ('Staggered', 'Stumbled or struggling to stand straight due to impact halved movement; impact and bludgeoning damage is doubled'),
        ('Prone', 'Laying down or flat on their back; all melee attacks gain a medium advantage all ranged attack gain a small disadvantage'),
        ('Restrained', 'incapable of moving arms and or legs; All attacks gain a medium advantage'),
        ('Dazed', 'concussed and are starstruck do that hit to the head or bright lights; melee attacks are made at a small disadvantage, ranged attacks are made with a medium disadvantage'),
        ('Flat-Footed', 'stumbling and unable to maintain stable footing; movement costs are doubled'),
        ('Inebriated', 'drunk or high something of the like; all rolls are made with a small disadvantage'),
    ]
    for name, d in conds:
        R.append(rule(name, 'Conditions', d[0].upper() + d[1:] + '.', d[0].upper() + d[1:] + '.\n\n*Source: Pathfinder node 17 (Exploit Instinct).*',
                      'condition, status, debuff'))
    # Glossary stubs: terms used across classes with no definition yet
    all_text = {}
    for c in classes:
        blob = json.dumps(c, ensure_ascii=False)
        all_text[c['name']] = blob
    terms = [
        ('Presence', 'presence'), ('Domain', 'domain'), ('Pace', 'pace'), ('Stride', 'stride'),
        ('Stance', 'stance'), ('True Damage', 'true damage'), ('Critical Hit', 'critical'),
        ('Epic Critical Hit', 'epic'), ('Glancing Blow / Stance Hit', 'stance hit'),
        ('Evasion Class (EC)', ' ec'), ('Armor Class (AC)', ' ac'), ('Brawn', 'brawn'), ('Stability', 'stability'),
        ('Stabilization Rest', 'stabilization rest'), ('Light Rest', 'light rest'), ('Heavy Rest', 'heavy rest'),
        ('Temporary HP', 'temp'), ('Fatigue', 'fatigue'), ('Bleed', 'bleed'), ('Lair Actions', 'lair action'),
        ('Combat Level (CL)', 'combat level'), ('Resistance and Immunity (RES / IMM)', 'res'),
        ('Burdens', 'burden'), ('Mana', 'mana'), ('Psi Power', 'psi'),
    ]
    for term, needle in terms:
        users = [n for n, blob in all_text.items() if re.search(r'\b' + re.escape(needle.strip()) + r'\b', blob, re.I)]
        R.append(rule(term, 'Glossary (needs definition)', 'Not defined yet.',
                      f'*This term is used in the class notes but has no definition yet.*\n\nUsed by: {", ".join(users) or "—"}',
                      ''))
    return R


def main():
    classes = build_classes()
    traits = build_traits()
    weapons, groups = build_weapons()
    modules = build_modules()
    rules = build_rules(classes, groups)
    # link rule ids for related
    by_name = {r['name']: r['id'] for r in rules}
    rel = {
        'Node System Overview': ['Core Nodes', 'Specialization Fractures', 'Augmentations'],
        'Core Nodes': ['Ascension Points', 'Multiclassing'],
        'Ascension Points': ['Core Nodes', 'Specialization Fractures', 'Augmentations'],
        'Specialization Fractures': ['Fracture Flexibility', 'Ascension Points'],
        'Augmentations': ['Augmentation Flexibility', 'Ascension Points'],
        'Attack Types': ['Weapon Groups'],
    }
    for r in rules:
        r['related'] = [by_name[n] for n in rel.get(r['name'], [])]
    seed = {'classes': classes, 'rules': rules, 'weapons': weapons, 'traits': traits, 'modules': modules}
    OUT.write_text('/* Generated by tools/build_seed.py from notes/*.md — do not edit by hand. */\n'
                   "'use strict';\nconst AOE_SEED = " + json.dumps(seed, ensure_ascii=False, indent=1) + ';\n',
                   encoding='utf-8')
    print(f'{len(classes)} classes, {sum(len(c["nodes"]) for c in classes)} nodes, {len(rules)} rules, '
          f'{len(weapons)} weapons, {len(traits)} traits, {len(modules)} modules -> {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
