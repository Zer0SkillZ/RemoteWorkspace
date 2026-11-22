/* Default lore for the Schools of Magic (Aetheric Manipulation).
 * Used to seed a fresh database; once loaded, everything is editable in the
 * "Schools" tab and saved with the rest of your data.
 */
'use strict';

const DEFAULT_MAGIC_OVERVIEW = {
  title: 'Aetheric Manipulation',
  text: 'In this vast universe, magic is not just a force—it\'s the very essence of existence, woven from the omnipresent Aether. This invisible energy flows through every plane of reality, born from the breath of ancient trees and the will of titanic entities. Casters bend the Aether to their will, shaping it into elemental forces or channeling its unique power to craft miracles or devastations. Each school of magic embodies a distinct path—a philosophy rooted in mastery, connection, or sacrifice, and those who wield Aetheric Manipulation must choose wisely which path they follow.',
};

const DEFAULT_SCHOOLS = [
  {
    name: 'Arcanation',
    description: 'This category represents magic that relies on external conduits, such as wands, staves, or focus crystals. Casters who use Arcanation channel the Aether through these objects to amplify elemental powers.',
    traits: [
      ['Conduit Dependency', 'Requires a physical tool for casting. Without the conduit, magic cannot be cast at all.'],
      ['Elemental Amplification', 'Basic elements like Fire, Ice, or Electric are enhanced through the conduit’s power.'],
      ['Focus and Precision', 'Casters excel in controlled, precise casting, making them skilled at manipulating specific elements.'],
    ],
    spellTypes: 'Offensive elemental spells (fireballs, lightning bolts), defensive barriers, and precision-based spells that target specific enemies or areas.',
    restrictions: 'If the caster loses their conduit or is in an environment that prevents the use of tools (such as a magical dampening field), they cannot cast spells. Damage to the conduit can reduce the effectiveness of their magic.',
    whoUses: 'Casters who value control, precision, and reliability gravitate towards Arcanation. Often scholars, battlemages, or those who prefer a structured approach to magic find this type of magic appealing. These individuals often rely on their knowledge of the Aether and mastery of their chosen conduit to cast powerful and consistent spells, making them dependable in situations where predictability is key.',
    figures: [
      ['Thaldris Arcano', 'Thaldris Arcano was an unrivaled master of conduits, a battlemage who pioneered the use of wands and staves as extensions of the Aether. He is credited with creating hundreds of elemental spells that rely on precise control, using arcane crystals embedded in his staff to amplify his abilities. Thaldris’ spells, like the devastating "Arcane Nova" and the defensive "Crystal Shield," are now staples for battlemages and scholars alike. His work reshaped how casters approached the use of external tools, and his work on elemental amplification are still studied by modern mages.'],
    ],
  },
  {
    name: 'Aetherion',
    description: 'Aetherion casters have learned to tap into the natural flow of Aether in the environment, allowing them to cast magic fluidly without needing external tools or components. They master the ebb and flow of the arcane energy around them.',
    traits: [
      ['Environmental Adaptation', 'Spells shift and adapt based on the environment, making casters versatile and capable in changing situations.'],
      ['Fluid Casting', 'The ability to modify spells on the fly, allowing for rapid spell combinations.'],
      ['Sustained Power', 'Casters can maintain spells for longer periods due to their direct connection to the Aether.'],
    ],
    spellTypes: 'Adaptive spells that change based on the caster’s environment, sustained spells that can last for long durations, and reactive spells that change based on external factors.',
    restrictions: 'Casting can be disrupted in areas with no Aether flow or in places where Aether is volatile. The caster\'s ability to control the flow may wane in unpredictable environments.',
    whoUses: 'Aetherion appeals to casters who prefer flexibility and adaptability. These casters are often seen as fluid, reactive, and quick-thinking, adjusting to their surroundings in real-time. They are the ones who thrive in uncertainty and enjoy experimenting with their magic\'s versatility.',
    figures: [],
  },
  {
    name: 'Faunaris',
    description: 'Casters of Faunaris magic channel the chaotic, untamed forces of nature. This magic is primal and often destructive, as the caster harnesses storms, earthquakes, and the fury of the elements. Faunaris also includes the ability to morph their bodies into animals, beasts, or hybrid forms.',
    traits: [
      ['Chaotic Power', 'Spells draw from nature’s raw and unpredictable forces, like lightning or earthquakes.'],
      ['Unpredictability', 'Magic may surge or change based on environmental conditions or the caster’s emotions.'],
      ['Nature’s Wrath', 'Abilities can cause widespread destruction but are difficult to control.'],
      ['Polymorphing', 'Faunaris users can alter their own form, taking on animalistic traits, becoming beasts, or transforming into hybrid creatures.'],
    ],
    spellTypes: 'Large-scale elemental spells (storms, quakes), environmental manipulation (growth, decay), destructive spells that impact wide areas, and polymorphing abilities that allow transformation into animals or beasts.',
    restrictions: 'Faunaris magic is difficult to control, and casters may find their spells going out of control or backfiring. Environmental factors may affect the strength or direction of their magic. Polymorphing can be physically exhausting and may not last indefinitely.',
    whoUses: 'Those who are deeply connected to the natural world but thrive on its unpredictability. Faunaris users often take on the role of natural defenders or disruptors, thriving in environments where chaos and destruction reign. They value the raw, untamed power of nature and the versatility of shapeshifting to adapt to different situations.',
    figures: [],
  },
  {
    name: 'Vitalis',
    description: 'Vitalis magic uses the caster’s life force as a source of power. These spells are often dark and come at a personal cost, but the resulting magic is deeply tied to the caster’s vitality and essence.',
    traits: [
      ['Health for Power', 'Spells drain health or vitality in exchange for greater power.'],
      ['Necrotic and Life-altering Spells', 'Includes life-stealing, necrotic energy, and other dark magics.'],
      ['Risk and Reward', 'Stronger spells come at greater personal risk, often leaving the caster vulnerable.'],
    ],
    spellTypes: 'Necrotic spells that steal life energy, blood rituals for powerful effects, and spells that alter or transform the caster’s body.',
    restrictions: 'Casters may suffer from fatigue, weakness, or long-term physical consequences from overusing Vitalis magic. External attacks that target their life force or vitality can severely weaken their abilities.',
    whoUses: 'Vitalis magic attracts those who are willing to sacrifice their own wellbeing for immense power. Often seen among dark priests, necromancers, and others who deal with death and life energy, these casters walk a dangerous path. They are willing to risk their own lives to achieve their goals.',
    figures: [],
  },
  {
    name: 'Elementus',
    description: 'This category involves the direct manipulation of raw elemental forces, allowing casters to control fire, ice, lightning, and more with sheer force of will.',
    traits: [
      ['Raw Elemental Control', 'Basic elements are shaped into devastating attacks.'],
      ['High Destruction', 'Focused on maximum damage and destruction.'],
      ['Elemental Mastery', 'Casters become experts in a single element, often honing it to its purest form.'],
    ],
    spellTypes: 'Pure elemental attacks (fireballs, lightning strikes, ice spikes), large-scale elemental destruction, and elemental defenses (shields, walls).',
    restrictions: 'Elementus magic can drain a caster’s energy quickly, especially when casting large-scale destructive spells. Some environments may dampen certain elements (e.g., water-dampening fire magic).',
    whoUses: 'Casters who seek raw power and direct elemental control gravitate towards Elementus. These individuals are typically elementalists or battlemages who use their mastery over a specific element to rain devastation upon their enemies. They value power and specialize in high-damage spells that leave a mark.',
    figures: [],
  },
  {
    name: 'Rithex',
    description: 'Magic in this category is ritualistic and often sacrificial. It draws on ancient, primal forces that require preparation, components, and sometimes personal sacrifice to cast.',
    traits: [
      ['Ritual Casting', 'Requires time, specific conditions, or components to cast.'],
      ['Sacrificial Magic', 'Spells often demand personal or material sacrifice to unleash greater power.'],
      ['Ancient Power', 'Taps into old, often forbidden knowledge or forces for immense but risky magic.'],
    ],
    spellTypes: 'Long-casting ritual spells, sacrificial spells that require materials or health, and powerful spells that summon ancient forces.',
    restrictions: 'Rituals can take significant time to prepare, and any disruption can prevent the spell from being cast. Some rituals demand rare components or high personal sacrifice.',
    whoUses: 'Casters who seek forbidden knowledge or are willing to invest time and resources in ancient rituals find Rithex appealing. They are often mysterious figures—sages, occultists, or dark priests—who wield ancient powers with calculated precision. They value patience, preparation, and immense power at a cost.',
    figures: [
      ['Shae’lara, Keeper of Rites', 'Shae’lara was an ancient priestess who unlocked forbidden knowledge, crafting rituals that required sacrifice and elaborate preparation. Her rituals—most notably "Summon the Forgotten Ones" and "Blood Binding"—are known for calling on ancient forces that even the bravest casters fear to tamper with. Shae’lara’s mastery of ritualistic magic made her a mysterious figure, and she left behind tomes of powerful rites that are still used by occultists and dark priests in search of immense, yet dangerous, power.'],
    ],
  },
  {
    name: 'Astralith',
    description: 'Astralith magic draws from the energy of stars, moons, and cosmic forces. These casters are in tune with the celestial bodies, using radiant or time-based magic to alter reality.',
    traits: [
      ['Radiant Magic', 'Taps into starlight or moonlight, dealing radiant and cosmic damage.'],
      ['Time Manipulation', 'Casters can alter time, slow enemies, or speed up events.'],
      ['Celestial Alignment', 'Spells may be stronger during celestial events like eclipses or meteor showers.'],
    ],
    spellTypes: 'Radiant energy beams, time-altering spells, and summoning celestial entities.',
    restrictions: 'Astralith magic is often tied to the alignment of celestial bodies. Spells may be weaker or less effective when the stars or moons are not aligned properly.',
    whoUses: 'Those who study the stars, moons, and cosmic events are drawn to Astralith. These casters are often astrologers, prophets, or cosmic mages who understand the celestial cycles and use their knowledge to alter time and reality itself. They are methodical and patient, waiting for the right moment to cast their most powerful spells.',
    figures: [],
  },
  {
    name: 'Umbrath',
    description: 'Umbrath taps into the dark, chaotic forces of the Void, a place beyond the known universe. These spells are unstable and can warp reality itself.',
    traits: [
      ['Reality Warping', 'Spells can destabilize reality, altering the physical world unpredictably.'],
      ['Chaos Magic', 'Highly dangerous and unstable, with effects that may backfire or surge uncontrollably.'],
      ['Dimensional Magic', 'Involves teleportation, portals, or even pulling energy from other dimensions.'],
    ],
    spellTypes: 'Reality-distorting magic, dimensional manipulation, teleportation, and chaos-based spells.',
    restrictions: 'Umbrath magic is highly volatile and unpredictable. Casters run the risk of damaging themselves or their surroundings, and spells may have unintended consequences.',
    whoUses: 'Umbrath attracts those who are willing to take risks and embrace chaos. These casters are often seen as unstable or reckless, but they wield immense power from the edges of reality. They are mages who thrive in instability and enjoy pushing the boundaries of magic, even at great personal risk.',
    figures: [],
  },
  {
    name: 'Syntharis',
    description: 'Syntharis involves blending multiple elements into hybrid spells, creating complex and powerful effects that draw from multiple sources.',
    traits: [
      ['Elemental Fusion', 'Combines two or more elements to create unique, hybrid spells (e.g., fire and lightning for Pyro-shock).'],
      ['Complex Casting', 'Requires mastery of multiple elements to pull off powerful combinations.'],
      ['Synergistic Effects', 'Hybrid spells can produce unexpected or amplified effects based on the elements used.'],
    ],
    spellTypes: 'Hybrid spells like Pyro-shock (fire and lightning), Cryo-light (ice and radiant), and more. Spells are often complex, combining the strengths of multiple elements.',
    restrictions: 'Managing multiple elements requires extreme control. If a caster loses focus, the elements may clash or fizzle out. Some elements may be incompatible in certain environments, making hybrid spells harder to maintain.',
    whoUses: 'Syntharis attracts the most ambitious and skilled elementalists. These casters seek to combine the powers of multiple elements, creating new and unpredictable effects. They value creativity, mastery, and pushing the boundaries of elemental magic to create something truly unique.',
    figures: [],
  },
  {
    name: 'Animara',
    description: 'Animara magic involves linking the caster’s soul to external entities, spirits, or objects, allowing them to draw power from these bonds. These connections can be empowering but also dangerous if severed.',
    traits: [
      ['Spiritual Bonds', 'The caster links their soul to spirits or objects, gaining unique powers tied to those bonds.'],
      ['Empowerment with Risk', 'The stronger the bond, the greater the power, but if the bond is broken, the caster suffers.'],
      ['Spirit Magic', 'Abilities often involve summoning, controlling, or channeling spiritual entities.'],
    ],
    spellTypes: 'Spirit summoning, soul-linking spells, and abilities that transfer or manipulate life energy through soul bonds.',
    restrictions: 'Breaking a soul bond can have severe consequences, including physical or mental damage. Spirit-based magic may weaken if the bond is disturbed or severed.',
    whoUses: 'Animara is favored by those who are willing to forge deep, often dangerous connections with otherworldly forces. These casters—spirit mediums, necromancers, or mystics—are attuned to the spiritual realm and use their bonds to tap into incredible power, at the risk of their own well-being.',
    figures: [],
  },
];
