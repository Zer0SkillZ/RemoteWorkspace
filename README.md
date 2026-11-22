# RPG Design Forge

A browser-based design tool for building tabletop RPG **classes**, **items** and **spells**.
No install, no server: open `index.html` in any modern browser.

## Running it

- **Locally:** download or clone this repo and double-click `index.html`.
- **Online (optional):** enable GitHub Pages for this repo (Settings → Pages → deploy from branch), then open the Pages URL.

Your work is saved automatically in the browser's local storage. **Use "Export JSON" regularly as a backup.** Clearing browser data deletes local storage. To move your work to another computer or share it, export JSON there and use "Import JSON".

## What it does

### Classes
- **Combat classes**: 20 levels. **Non-combat classes**: 10 levels, and attack node types are hidden.
- Each level is a **class node** with a name, a type (Action, Reaction, Attack Action, Attack Reaction, Passive, Unique Ability), and a description.
- **Augmentations**: each class can have one or more. Each has a name and a philosophy. Marking a node as an **Augmentation node** gives you a variant of that node for every augmentation.
- **Fractured nodes**: a node can have one or more **fracture paths**. Each path is an ordered list of fractures. A node can have only **one ★ Master Fracture**, across all its paths.
- A node can be an Augmentation node **or** a Fractured node, not both.
- **Ascendancy point** totals are calculated per node, per path and per class.

### Items
- Description
- One or more actions (Attack Action, Reaction, Special Attack, …)
- **Unique attribute**
- **Attack attribute**: Strength, Dexterity, Wittyness or Intelligence

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
- Starts with five rules drafted from your notes so far: Ascendancy Points, Class Nodes, Augmentations, Fractured Nodes and Attack Attributes.
- Link rules inside the text with `[[Rule Name]]`. In Preview, clicking a link opens that rule. A link to a rule that doesn't exist shows in red and offers to create it.
- Each rule lists the other rules that mention it ("Mentioned In").

### Search (all tabs)
- **Exact matches** come first, then **similar** results. When nothing matches exactly, the closest results are shown.
- Vague search tolerates typos ("acsendency", "agumentation"), partial words ("fractur") and different word forms ("fractured" ≈ "fracture").
- It also matches a rule's **keywords**, so "xp" or "level up" finds *Ascendancy Points*. Add keywords for the words players actually use.
- Press **Enter** to open the top result and **Esc** to clear the search.

### Everywhere
- Search, duplicate, delete
- **Preview** mode: a formatted read-only view
- Copy or download any entry as **Markdown** (for Google Docs, Discord, Homebrewery, Obsidian…), or export everything at once
- **Settings**: edit the dropdown lists (node types, item action types) and the Ascendancy point costs

## Ascendancy point costs (defaults, editable in Settings)

| Thing | Cost |
|---|---|
| Class node | 500 |
| Augmentation node | 500 |
| First fracture on a path | 500 |
| Each additional fracture on that path | 250 |
| Master fracture | 500 |

## Project layout

```
index.html      page shell
css/style.css   styling
js/app.js       all app logic (data model, editors, export/import)
js/schools-data.js  default Schools of Magic lore (seeds new data)
js/search.js    exact + fuzzy search
```

The JSON export is the source of truth. It is plain, readable JSON, so other tools (character sheets, a VTT exporter, etc.) can be built on top of it later.
