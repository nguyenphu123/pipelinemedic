import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { DiagnosisError } from './schema.js';

export const platforms = ['gitlab', 'jenkins', 'github', 'azure', 'circleci', 'other'];

const pipelineInput = z.object({
  name: z.string().trim().min(2).max(80), platform: z.enum(platforms),
  repositoryUrl: z.string().trim().max(300).default(''), configPath: z.string().trim().min(1).max(180),
  environment: z.enum(['development', 'staging', 'production', 'mixed']).default('mixed'),
  runnerLocation: z.enum(['on-premises', 'cloud-hosted', 'self-hosted-cloud', 'mixed', 'unknown']).default('unknown'),
  description: z.string().trim().max(500).default(''), configText: z.string().max(100_000),
  enabled: z.boolean().default(true), changeNote: z.string().trim().max(160).default('Configuration updated'),
}).strict();

const databases = new Map();
function databasePath() { return process.env.PIPELINEMEDIC_DB_PATH || join(process.cwd(), '.data', 'pipelinemedic.db'); }
export function getDatabase() {
  const path = databasePath();
  if (databases.has(path)) return databases.get(path);
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS pipelines (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, platform TEXT NOT NULL, repository_url TEXT NOT NULL DEFAULT '',
      config_path TEXT NOT NULL, environment TEXT NOT NULL, runner_location TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '', config_text TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1,
      version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pipeline_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, pipeline_id TEXT NOT NULL, version INTEGER NOT NULL,
      config_text TEXT NOT NULL, note TEXT NOT NULL, created_at TEXT NOT NULL,
      FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE, UNIQUE(pipeline_id, version)
    );
    CREATE INDEX IF NOT EXISTS pipeline_versions_lookup ON pipeline_versions(pipeline_id, version DESC);
  `);
  databases.set(path, db); seed(db); return db;
}

const seeds = [
  { id: 'pipe-gitlab-api', name: 'Platform API', platform: 'gitlab', configPath: '.gitlab-ci.yml', environment: 'production', runnerLocation: 'on-premises', description: 'Build, test and deploy the API service.', configText: `stages:\n  - test\n  - build\n\ntest:\n  stage: test\n  script:\n    - npm ci\n    - npm test\n\nbuild:\n  stage: build\n  script:\n    - docker build -t platform-api:$CI_COMMIT_SHA .` },
  { id: 'pipe-jenkins-web', name: 'Customer Web', platform: 'jenkins', configPath: 'Jenkinsfile', environment: 'staging', runnerLocation: 'on-premises', description: 'Jenkins delivery flow for the web application.', configText: `pipeline {\n  agent any\n  stages {\n    stage('Test') {\n      steps { sh 'npm ci && npm test' }\n    }\n    stage('Build') {\n      steps { sh 'npm run build' }\n    }\n  }\n}` },
  { id: 'pipe-github-worker', name: 'Event Worker', platform: 'github', configPath: '.github/workflows/ci.yml', environment: 'development', runnerLocation: 'cloud-hosted', description: 'Pull-request checks for the background worker.', configText: `name: Worker CI\non:\n  pull_request:\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm ci\n      - run: npm test` },
];

function seed(db) {
  if (db.prepare('SELECT COUNT(*) AS count FROM pipelines').get().count) return;
  const now = new Date().toISOString();
  const add = db.prepare(`INSERT INTO pipelines (id,name,platform,repository_url,config_path,environment,runner_location,description,config_text,enabled,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,1,1,?,?)`);
  const version = db.prepare('INSERT INTO pipeline_versions (pipeline_id,version,config_text,note,created_at) VALUES (?,1,?,?,?)');
  db.exec('BEGIN');
  try { for (const item of seeds) { add.run(item.id,item.name,item.platform,'',item.configPath,item.environment,item.runnerLocation,item.description,item.configText,now,now); version.run(item.id,item.configText,'Initial configuration',now); } db.exec('COMMIT'); }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}

function rowToPipeline(row, includeConfig = false) {
  const value = { id:row.id,name:row.name,platform:row.platform,repositoryUrl:row.repository_url,configPath:row.config_path,environment:row.environment,runnerLocation:row.runner_location,description:row.description,enabled:Boolean(row.enabled),version:row.version,createdAt:row.created_at,updatedAt:row.updated_at };
  if (includeConfig) value.configText = row.config_text;
  return value;
}

export function validatePipelineConfig(platform, configText) {
  const text = configText.trim(); const issues = [];
  if (!text) issues.push('Configuration cannot be empty.');
  if (text.includes('\t') && ['gitlab','github','azure','circleci'].includes(platform)) issues.push('YAML indentation must use spaces, not tabs.');
  if (platform === 'gitlab' && text && !/(^|\n)(stages|workflow|include|[A-Za-z0-9_.-]+):/m.test(text)) issues.push('Expected a GitLab CI job, stages, workflow or include entry.');
  if (platform === 'jenkins' && text && !/\b(pipeline|node)\s*\{/m.test(text)) issues.push('Expected a Jenkins pipeline { } or node { } block.');
  if (platform === 'jenkins' && (text.match(/\{/g)?.length || 0) !== (text.match(/\}/g)?.length || 0)) issues.push('Jenkins block braces are unbalanced.');
  if (platform === 'github' && text && (!/(^|\n)jobs\s*:/m.test(text) || !/(^|\n)(on|['"]on['"])\s*:/m.test(text))) issues.push('GitHub Actions configuration needs both on and jobs sections.');
  if (platform === 'azure' && text && !/(^|\n)(trigger|pr|stages|jobs|steps)\s*:/m.test(text)) issues.push('Expected an Azure Pipelines trigger, stage, job or step.');
  if (platform === 'circleci' && text && (!/(^|\n)version\s*:/m.test(text) || !/(^|\n)(jobs|workflows)\s*:/m.test(text))) issues.push('CircleCI configuration needs version and jobs or workflows.');
  return { valid: issues.length === 0, issues, checkedAt: new Date().toISOString(), level: 'structural' };
}

function parseInput(value) {
  const parsed = pipelineInput.safeParse(value);
  if (!parsed.success) throw new DiagnosisError(parsed.error.issues[0]?.message || 'Invalid pipeline data.', 400);
  const validation = validatePipelineConfig(parsed.data.platform, parsed.data.configText);
  if (!validation.valid) throw new DiagnosisError(validation.issues.join(' '), 422);
  return parsed.data;
}

export function listPipelines() { return getDatabase().prepare('SELECT * FROM pipelines ORDER BY updated_at DESC, name ASC').all().map(row => rowToPipeline(row)); }
export function getPipeline(id) {
  const db = getDatabase(); const row = db.prepare('SELECT * FROM pipelines WHERE id = ?').get(id);
  if (!row) throw new DiagnosisError('Pipeline not found.', 404);
  const value = rowToPipeline(row, true);
  value.versions = db.prepare('SELECT version,note,created_at AS createdAt FROM pipeline_versions WHERE pipeline_id = ? ORDER BY version DESC LIMIT 20').all(id);
  value.validation = validatePipelineConfig(value.platform, value.configText); return value;
}
export function createPipeline(value) {
  const input = parseInput(value); const db = getDatabase(); const id = randomUUID(); const now = new Date().toISOString();
  db.exec('BEGIN');
  try {
    db.prepare(`INSERT INTO pipelines (id,name,platform,repository_url,config_path,environment,runner_location,description,config_text,enabled,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,1,?,?)`).run(id,input.name,input.platform,input.repositoryUrl,input.configPath,input.environment,input.runnerLocation,input.description,input.configText,Number(input.enabled),now,now);
    db.prepare('INSERT INTO pipeline_versions (pipeline_id,version,config_text,note,created_at) VALUES (?,1,?,?,?)').run(id,input.configText,'Initial configuration',now); db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  return getPipeline(id);
}
export function updatePipeline(id, value) {
  const input = parseInput(value); const db = getDatabase(); const current = db.prepare('SELECT * FROM pipelines WHERE id = ?').get(id);
  if (!current) throw new DiagnosisError('Pipeline not found.', 404);
  const changed = current.config_text !== input.configText; const version = current.version + (changed ? 1 : 0); const now = new Date().toISOString();
  db.exec('BEGIN');
  try {
    db.prepare(`UPDATE pipelines SET name=?,platform=?,repository_url=?,config_path=?,environment=?,runner_location=?,description=?,config_text=?,enabled=?,version=?,updated_at=? WHERE id=?`).run(input.name,input.platform,input.repositoryUrl,input.configPath,input.environment,input.runnerLocation,input.description,input.configText,Number(input.enabled),version,now,id);
    if (changed) db.prepare('INSERT INTO pipeline_versions (pipeline_id,version,config_text,note,created_at) VALUES (?,?,?,?,?)').run(id,version,input.configText,input.changeNote,now); db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  return getPipeline(id);
}
export function deletePipeline(id) { const result = getDatabase().prepare('DELETE FROM pipelines WHERE id = ?').run(id); if (!result.changes) throw new DiagnosisError('Pipeline not found.', 404); }
