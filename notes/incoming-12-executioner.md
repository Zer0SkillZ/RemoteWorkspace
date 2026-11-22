# Incoming notes, part 12: Executioner
(Saved while waiting for ☆Go. Not yet applied to the app. Original wording kept.
In the source, each title had its node type run into it, e.g. "DoctrineCore Passive Node"; split below
as **Name** — *Type*. No identity / resources / proficiencies block was given yet.)

### 1. Doctrine — *Core Passive Node*
When wielding an Executioner-favored weapon:
- Reduce base weapon damage by 1 (minimum 1).
- On any successful Hit, apply +1 Bleed.
Bleed stacks normally.

### 2. Sense — *Passive Node*
- Gain Small Advantage on attacks against creatures suffering Bleed.
- The first time you successfully hit a creature each encounter, you learn whether it is Immune,
  Resistant, or Vulnerable to Bleed or internal damage.

### 3. Precision Over Force — *Passive Node*
When attacking with an Executioner-favored weapon:
- Reduce the target's Critical Threshold by 1.
This reduction does not stack with itself.

### 4. Trauma Trauma — *Passive Node*   ← name appears doubled in the source
Each time you apply Bleed to a creature already suffering Bleed:
- Add +1 additional Bleed to the total applied.
This bonus Bleed adds to stored values only.

### 5. Critical Bleeder — *Core Class Mechanic*
- Your Bleed no longer deals damage over time.
- All Bleed instead accumulates as Blood Loss, persisting until released by Incision or until the end of
  the encounter.

**Blood Loss Escalation**
- On first Blood Loss: the target rolls 1d10, succeeding only on a result greater than 1.
- Each subsequent Blood Loss hit reduces the success chance by 10%.
- Failure escalates: Blood Loss → Critical Blood Loss → Grievous Blood Loss

**Incision** — Cost: 1 AP | 1 CP
- Instantly release all stored Blood Loss as damage.

**Critical Blood Loss**
- Incision gains +1 damage per 5 stored Blood Loss, rounded up.

**Grievous Blood Loss**
- Gains all Critical Blood Loss benefits.
- Half the released damage deals Bleed damage to all hostile creatures within 5 ft.

### 6. Hemorrhage — *Reaction Node*
Reaction | Cost: 1 RP
When a creature with Blood Loss succeeds an escalation roll:
- Force a reroll, the target creature takes the worse result.
Once per creature per encounter.

### 7. Opportunist — *Passive Node*
Against creatures with Critical or Grievous Blood Loss:
- Gain Medium Advantage on attack rolls.
On a Critical or Epic Hit, you gain 1 CP (once per round).   ← stray "d" at end of line in source

### 8. Red Threshold — *Passive Node*
When a creature's Blood Loss equals or exceeds half its remaining HP:
- Incision costs 0 CP.
Once per creature per encounter.

### 9. Anatomical Master — *Passive Node*
Incision damage:
- Ignores Stance resistance.
- Deals half damage to Stance even if the target survives.
Bleed-immune creatures instead take half released Blood Loss as True Damage when Incised.

### 10. Crimson Verdict
Once per encounter, when Incising a creature with Grievous Blood Loss:
- Treat the Incision as an Epic Hit.
- If reduced to 0 HP, the creature cannot be revived for the remainder of the encounter.

### 11. Compounding Hemorrhage — *Passive Node*
When applying Blood Loss to a creature with Critical Blood Loss or higher:
- Add +2 Blood Loss instead of +1.
This bonus does not independently trigger escalation.

### 12. Flow Interruption — *Reaction Node*
Reaction | Cost: 1 RP
When a creature with Blood Loss would restore HP or Stance:
- Reduce the amount by half.
If the creature is under Grievous Blood Loss, restoration is fully negated.

### 13. Vascular Mapping — *Passive Node*
When you perform an Incision:
- Choose one creature within 5 ft.
- That creature gains Blood Loss equal to ¼ of the released damage, rounded up.
This does not immediately trigger escalation.

### 14. Controlled Rupture — *Action Modifier Node*
When performing an Incision, choose one:
- **Focused Release**: +25% Incision damage (rounded down). No AoE effects occur.
- **Violent Rupture**: AoE radius increases to 10 ft. Secondary targets take the full half-damage value.

### 15. The Executioners Oath
*You are the one who expedites their oath to death, you are the life cycle.*
(no mechanics given yet)

### 16. Exsanguination Window — *Special Action Node*
Cost: 1 AP | 1 CP
Choose a creature with Blood Loss. Until the start of your next turn:
- That creature automatically fails its next escalation roll.
If this causes Grievous Blood Loss:
- Your next Incision costs 0 CP.

### 17. Arterial Collapse — *Passive Node*
At the end of each round:
- Creatures with Grievous Blood Loss lose 1 Stance per 2 stored Blood Loss, rounded down at the start of
  their turn.
This Stance loss ignores resistance.

### 18. Surgical Cascade — *Passive Node*
When an Incision reduces a creature to 0 HP:
- Transfer its remaining Blood Loss to another creature within 10 ft.
You may do this twice per stabilization rest.
The transfer does not immediately trigger escalation.

### 19. Crimson Economy — *Passive Node*
Twice per stabilization rest, you may reroll an attack roll.
your blood loss escalations are at 3x the speed.

### 20. Red Silence Doctrine — *Capstone Node*
Once per encounter, when performing an Incision:
- All creatures within 10 ft immediately make Blood Loss escalation checks.
Creatures that reach Grievous Blood Loss:
- Cannot take Reactions.
If the primary target is reduced to 0 HP:
- All secondary damage is treated as True Damage in a 10 ft AoE.
