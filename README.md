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
- **Fractured nodes**: a node can have one or more **fracture paths**. Each path is an ordered list of fractures with an optional **★ Master Fracture** at the end.
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

### Everywhere
- Search, duplicate, delete
- **Preview** mode: a formatted read-only view
- Copy or download any entry as **Markdown** (for Google Docs, Discord, Homebrewery, Obsidian…), or export everything at once
- **Settings**: edit the dropdown lists (node types, item action types, schools of magic) and the Ascendancy point costs

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
```

The JSON export is the source of truth. It is plain, readable JSON, so other tools (character sheets, a VTT exporter, etc.) can be built on top of it later.
