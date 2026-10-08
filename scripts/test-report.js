import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const files = readdirSync(path.join(root, 'tests')).filter(name => name.endsWith('.test.js')).sort().map(name => `tests/${name}`);
const run = spawnSync(process.execPath, ['--test', '--test-reporter=tap', ...files], { cwd: root, encoding: 'utf8', timeout: 120000 });
mkdirSync(path.join(root, '.test-artifacts'), { recursive: true });
writeFileSync(path.join(root, '.test-artifacts/automated-tests.tap'), (run.stdout || '') + (run.stderr || ''));
if (run.error) { console.error(run.error.message); process.exit(1); }
const cases = [...run.stdout.matchAll(/^(not ok|ok) (\d+) - (.+)$/gm)];
const totals = [...run.stdout.matchAll(/^# (tests|pass|fail|skipped|cancelled) (\d+)$/gm)].map(m => `${m[1]}: ${m[2]}`).join(' · ');
const escape = text => text.replace(/\|/g, '\\|');
const version = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).version;
writeFileSync(path.join(root, 'devpost/automated-test-results.md'), [
  '# Automated test results', '',
  `Run: ${new Date().toISOString()} · PipelineMedic ${version} · ${process.version} · ${process.platform}`, '',
  `Command: \`npm run test:report\``, '', `**${totals}**`, '',
  'Local deterministic tests and mock-provider contracts only. Live model and Docker checks are tracked separately in TEST_CASES.md. Raw TAP output is in the ignored .test-artifacts/ directory.', '',
  '| ID | Test case / asserted outcome | Result |', '|---|---|---|',
  ...cases.map((m, i) => `| AUTO-${String(i + 1).padStart(3, '0')} | ${escape(m[3])} | ${m[1] === 'ok' ? 'PASS' : 'FAIL'} |`), '',
  'IDs identify this report snapshot; use the test name as the stable code search anchor.', '',
].join('\n'));
console.log(totals);
console.log(`Wrote devpost/automated-test-results.md (${cases.length} cases).`);
if (run.status !== 0) console.error(run.stdout);
process.exit(run.status ?? 1);
