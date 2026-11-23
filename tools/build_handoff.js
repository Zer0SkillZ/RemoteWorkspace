#!/usr/bin/env node
/* Builds docs/AOE-full-handoff.md: the handover brief + the full content of the
 * program (every class, weapon, trait, module, school and rule) as Markdown.
 * Run from the repo root:  node tools/build_handoff.js
 * Uses the pre-installed Playwright to run the app's own Markdown export. */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + path.join(root, 'index.html'));
  const md = await page.evaluate(() => allToMarkdown());
  await browser.close();

  const brief = fs.readFileSync(path.join(root, 'docs/brainstorm-handover.md'), 'utf8')
    .replace('Paste this whole document as the first message of a new chat, or add it to a Claude Project as a file.',
      'Upload this file to a new chat or add it to a Claude Project. Part 1 is the briefing; Part 2 is the complete design content, so you can quote and check exact rules.');
  const body = md.replace(/^# Ascension Of The Explorers Game Development Export\n\*Exported [^\n]*\*\n/, '');
  const sections = (body.match(/^# .+$/gm) || []).map((h) => `- ${h.slice(2)}`).join('\n');
  const out = [
    brief.trim(),
    '',
    '---',
    '',
    '# Part 2: Complete design content',
    '',
    `*Generated ${new Date().toISOString().slice(0, 10)} from the design program. Headings below go one level deeper per section.*`,
    '',
    '**Sections:**',
    sections,
    '',
    body.replace(/^(#{1,5}) /gm, '#$1 '),
  ].join('\n');
  fs.writeFileSync(path.join(root, 'docs/AOE-full-handoff.md'), out);
  console.log(`docs/AOE-full-handoff.md: ${out.length.toLocaleString()} characters, ${out.split('\n').length} lines`);
})();
