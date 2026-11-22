# Ascension Of The Explorers Game Development

A browser-based design tool for building tabletop RPG **classes**, **items** and **spells**.
No install, no server: open `index.html` in any modern browser.

## Running it

- **Locally:** download or clone this repo and double-click `index.html`.
- **Online (optional):** enable GitHub Pages for this repo (Settings → Pages → deploy from branch), then open the Pages URL.

Your work is saved automatically in the browser's local storage. **Use "Export JSON" regularly as a backup.** Clearing browser data deletes local storage. To move your work to another computer or share it, export JSON there and use "Import JSON".

## What it does

### AOE content (built in)
The program starts with everything from the design notes in `notes/`:
- **10 classes:** Monk (nodes 1–3 so far), Warrior, Scoundrel, Templar, Pathfinder, Priest, Executioner, Scrapper, Mecha-Tech and Genomancer.
- **Augmentation Paths:** the four Monk traditions, the six Warrior sins, and Nox for the Templar.
- **Fractures:** with Lesser/Greater tiers and branching.
- **50 weapons, 45 weapon traits and 30 mech modules.**
- **45 rules:** the node system, attack types, advantage steps, conditions, and glossary stubs for terms that still need definitions.

`tools/build_seed.py` turns the notes into `js/aoe-data.js`. If you edit the notes, run `python3 tools/build_seed.py`, then use **Settings → Reload AOE content from notes**.

### Classes
- **Combat classes**: 20 Core Nodes. **Non-combat classes**: 10, and attack node types are hidden.
- Class Identity, Base Resources (AP/RP/BP plus class resources like Combo, Chakra and Overdrive) and Recommended Proficiencies.
- Each Core Node has a name, type, flavor line, cost/frequency line ("1 AP | 1 BP | Cooldown 3 Rounds"), mechanics, **grants** ("In addition…") and designer notes.
- **Augmentation Paths**: exclusive philosophies (traditions, sins, graft-gods). On an Augmentation node, each path gets a full variant: name, tagline, cost, appearance/transformation, mechanics, flaw and closing quote. Augmentation nodes cost 0.
- **Fracture paths**: each fracture has a tier (Free 0 / Lesser 250 / Greater 500) and can **build on** another fracture, so paths can branch (e.g. Stand the Line → Buckler / Crest / Tower Shield).
- A node can be an Augmentation node **or** a Fractured node, not both.
- **Ascension Point** totals are calculated per path and per class.

### Weapons, Weapon Traits, Mech Modules
- **Weapons**: group, specialized talent (linked to Weapon Traits), and one or more attack profiles (attack type, AP, damage and type, Crit, Epic, Range).
- **Weapon Traits**: name, rarity and effect, and which weapons use each trait. Renaming a trait updates its weapons.
- **Mech Modules**: category, complexity, cost, visual, effect, execution and Ascension scaling.

### Items
- Description
- One or more actions (Attack Action, Reaction, Special Attack, …)
- **Unique attribute**
- **Attack type**: Graceful, Charm/PSI, Might, Keen, Athose, Heft or Finesse

### Spells
- Name, school of magic, description, action description (mechanics)
- Mana/UP cost and AP cost
- **School adaptations**: per-school mechanical and visual changes

### Schools of Magic
- The **Aetheric Manipulation** overview, plus the 10 schools: Arcanation, Aetherion, Faunaris, Vitalis, Elementus, Rithex, Astralith, Umbrath, Syntharis and Animara.
- Each school has a description, traits, types of spells, restrictions, who would use it, and notable figures (such as Thaldris Arcano and Shae’lara).
- The school dropdowns on spells come from this tab. Renaming a school updates every spell that uses it.
- Each school page lists its native spells and the spells adapted from other schools.

### Rules
- Each rule has a name, category, one-line summary, full text, keywords/aliases, and related rules.
- Starts with the AOE rules from your notes: Node System Overview, Core Nodes, Multiclassing, Ascension Points, Specialization Fractures, Augmentations, the two AG Discretion rules, Base Resources, Attack Types, Advantage, Weapon Groups, Conditions, and a "needs definition" glossary.
- Link rules inside the text with `[[Rule Name]]` (or `[[Rule Name|label]]`). In Preview, clicking a link opens that rule. A link to a rule that doesn't exist shows in red and offers to create it.
- Each rule lists the other rules that mention it ("Mentioned In").

### Search (all tabs)
- **Exact matches** come first, then **similar** results. When nothing matches exactly, the closest results are shown.
- Vague search tolerates typos ("acsendency", "agumentation"), partial words ("fractur") and different word forms ("fractured" ≈ "fracture").
- It also matches a rule's **keywords**, so "xp" or "level up" finds *Ascension Points*. Add keywords for the words players actually use.
- Press **Enter** to open the top result and **Esc** to clear the search.

### Everywhere
- Search, duplicate, delete
- **Preview** mode: a formatted read-only view
- Copy or download any entry as **Markdown** (for Google Docs, Discord, Homebrewery, Obsidian…), or export everything at once
- **Settings**: edit the dropdown lists (node types, item action types, attack types, damage types) and the Ascension Point costs

## Ascension Point costs (defaults, editable in Settings)

| Thing | Cost |
|---|---|
| Core node | 500 |
| Augmentation node | 0 |
| Free fracture | 0 |
| Lesser fracture | 250 |
| Greater fracture | 500 |

## Project layout

```
index.html      page shell
css/style.css   styling
js/app.js       all app logic (data model, editors, export/import)
js/schools-data.js  default Schools of Magic lore (seeds new data)
js/search.js    exact + fuzzy search
js/aoe-data.js  AOE content generated from notes/ (do not edit by hand)
tools/build_seed.py  rebuilds js/aoe-data.js from notes/
notes/          your design notes, as sent
```

The JSON export is the source of truth. It is plain, readable JSON, so other tools (character sheets, a VTT exporter, etc.) can be built on top of it later.
