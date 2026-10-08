import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { DiagnosisError } from './schema.js';
import { redact } from './redact.js';
import { getDatabase } from './pipeline-store.js';

const statuses = ['queued','running','success','failed','canceled'];
const runInput = z.object({
  pipelineId:z.string().min(1).max(100), providerRunId:z.string().trim().max(120).default(''),
  branch:z.string().trim().min(1).max(160).default('main'), commitSha:z.string().trim().max(64).default(''),
  status:z.enum(statuses), triggerSource:z.string().trim().max(80).default('webhook'),
  startedAt:z.string().datetime(), finishedAt:z.string().datetime().nullable().default(null),
  durationSeconds:z.number().int().min(0).max(604800).default(0), jobsTotal:z.number().int().min(0).max(10000).default(1),
  jobsFailed:z.number().int().min(0).max(10000).default(0), logText:z.string().max(100000).default(''),
}).strict();

function setup() {
  const db=getDatabase();
  db.exec(`CREATE TABLE IF NOT EXISTS pipeline_runs (
    id TEXT PRIMARY KEY, pipeline_id TEXT NOT NULL, provider_run_id TEXT NOT NULL DEFAULT '', run_number INTEGER NOT NULL,
    branch TEXT NOT NULL, commit_sha TEXT NOT NULL DEFAULT '', status TEXT NOT NULL, trigger_source TEXT NOT NULL,
    started_at TEXT NOT NULL, finished_at TEXT, duration_seconds INTEGER NOT NULL DEFAULT 0,
    jobs_total INTEGER NOT NULL DEFAULT 0, jobs_failed INTEGER NOT NULL DEFAULT 0, log_text TEXT NOT NULL DEFAULT '',
    synthetic INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
    FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE, UNIQUE(pipeline_id, run_number)
  ); CREATE INDEX IF NOT EXISTS pipeline_runs_recent ON pipeline_runs(started_at DESC);
  CREATE INDEX IF NOT EXISTS pipeline_runs_pipeline ON pipeline_runs(pipeline_id, run_number DESC);`);
  if (!db.prepare('SELECT COUNT(*) AS count FROM pipeline_runs').get().count) seedRuns(db);
  return db;
}

function ago(hours) { return new Date(Date.now()-hours*3600000).toISOString(); }
function seedRuns(db) {
  const rows=[
    ['run-gl-api-48','pipe-gitlab-api',48,'release/2.4','a81d9cf','failed',2,1,168,2,`Running with gitlab-runner 18.4.0\nPreparing the "docker" executor\nAuthenticating with credentials from job payload\nPulling docker image registry.internal.example/platform/node:24\nError response from daemon: Head "https://registry.internal.example/v2/platform/node/manifests/24": denied: requested access to the resource is denied\nERROR: Job failed: exit code 1`],
    ['run-web-315','pipe-jenkins-web',315,'main','7b29c10','success',5,0,242,7,'Finished: SUCCESS'],
    ['run-worker-91','pipe-github-worker',91,'feature/billing','52ae104','failed',1,1,54,12,`Run npm ci\nnpm warn deprecated inflight@1.0.6\nRun npm test\n/bin/bash: line 1: npm: command not found\nError: Process completed with exit code 127.`],
    ['run-gl-api-47','pipe-gitlab-api',47,'main','c08ad21','success',4,0,155,28,'Job succeeded'],
    ['run-web-314','pipe-jenkins-web',314,'main','46f90bc','failed',2,1,311,31,`[Pipeline] sh\n+ npm ci\nnpm ERR! code EAI_AGAIN\nnpm ERR! request to https://registry.npmjs.org failed, reason: getaddrinfo EAI_AGAIN registry.npmjs.org\nERROR: script returned exit code 1\nFinished: FAILURE`],
    ['run-worker-90','pipe-github-worker',90,'main','e111acc','success',3,0,61,45,'Process completed with exit code 0.'],
    ['run-gl-api-46','pipe-gitlab-api',46,'main','077da12','success',4,0,149,55,'Job succeeded'],
    ['run-web-313','pipe-jenkins-web',313,'hotfix/nav','de81aa4','success',5,0,230,72,'Finished: SUCCESS'],
    ['run-worker-89','pipe-github-worker',89,'main','3fd4ac1','canceled',1,0,19,96,'The operation was canceled.'],
  ];
  const add=db.prepare(`INSERT INTO pipeline_runs (id,pipeline_id,provider_run_id,run_number,branch,commit_sha,status,trigger_source,started_at,finished_at,duration_seconds,jobs_total,jobs_failed,log_text,synthetic,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?)`);
  for(const [id,pipelineId,num,branch,sha,status,jobs,failed,duration,hours,log] of rows){const started=ago(hours),finished=status==='running'?null:new Date(new Date(started).getTime()+duration*1000).toISOString();add.run(id,pipelineId,String(num),num,branch,sha,status,'synthetic demo',started,finished,duration,jobs,failed,log,started);}
}

function mapRun(row,details=false){
  const value={id:row.id,pipelineId:row.pipeline_id,pipelineName:row.pipeline_name,platform:row.platform,providerRunId:row.provider_run_id,runNumber:row.run_number,branch:row.branch,commitSha:row.commit_sha,status:row.status,triggerSource:row.trigger_source,startedAt:row.started_at,finishedAt:row.finished_at,durationSeconds:row.duration_seconds,jobsTotal:row.jobs_total,jobsFailed:row.jobs_failed,synthetic:Boolean(row.synthetic)};
  if(details){value.logText=row.log_text;value.configText=row.config_text;value.runnerLocation=row.runner_location;value.environment=row.environment;value.configPath=row.config_path;}
  return value;
}

const select=`SELECT r.*,p.name AS pipeline_name,p.platform,p.config_text,p.runner_location,p.environment,p.config_path FROM pipeline_runs r JOIN pipelines p ON p.id=r.pipeline_id`;
export function listRuns({status,limit=50,pipelineId}={}) {
  const db=setup();const clauses=[],values=[];
  if(status){if(!statuses.includes(status))throw new DiagnosisError('Unsupported run status.');clauses.push('r.status=?');values.push(status);}
  if(pipelineId){clauses.push('r.pipeline_id=?');values.push(pipelineId);}
  const safeLimit=Math.max(1,Math.min(Number(limit)||50,100));
  return db.prepare(`${select}${clauses.length?` WHERE ${clauses.join(' AND ')}`:''} ORDER BY r.started_at DESC LIMIT ?`).all(...values,safeLimit).map(row=>mapRun(row));
}
export function getRun(id){const row=setup().prepare(`${select} WHERE r.id=?`).get(id);if(!row)throw new DiagnosisError('Pipeline run not found.',404);return mapRun(row,true);}
export function createRun(value){
  const parsed=runInput.safeParse(value);if(!parsed.success)throw new DiagnosisError(parsed.error.issues[0]?.message||'Invalid run data.',400);const input=parsed.data,db=setup();
  if(!db.prepare('SELECT id FROM pipelines WHERE id=?').get(input.pipelineId))throw new DiagnosisError('Pipeline not found.',404);
  const id=randomUUID(),number=(db.prepare('SELECT COALESCE(MAX(run_number),0)+1 AS number FROM pipeline_runs WHERE pipeline_id=?').get(input.pipelineId).number),now=new Date().toISOString();
  const safeLog=redact(input.logText).text;
  db.prepare(`INSERT INTO pipeline_runs (id,pipeline_id,provider_run_id,run_number,branch,commit_sha,status,trigger_source,started_at,finished_at,duration_seconds,jobs_total,jobs_failed,log_text,synthetic,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?)`).run(id,input.pipelineId,input.providerRunId,number,input.branch,input.commitSha,input.status,input.triggerSource,input.startedAt,input.finishedAt,input.durationSeconds,input.jobsTotal,input.jobsFailed,safeLog,now);
  return getRun(id);
}
export function getDashboard(){
  const db=setup(),runs=listRuns({limit:100}),completed=runs.filter(r=>['success','failed','canceled'].includes(r.status)),success=completed.filter(r=>r.status==='success').length;
  const failureGroups=['Access & registry','Network & DNS','Runtime & dependencies','TLS & certificates'].map(name=>({name,count:0}));
  const failedDetails=db.prepare(`${select} WHERE r.status='failed' ORDER BY r.started_at DESC`).all();
  const failurePatterns={
    'Access & registry':/denied|unauthorized|forbidden/i,'Network & DNS':/EAI_AGAIN|timeout|connection refused/i,
    'Runtime & dependencies':/not found|MODULE_NOT_FOUND|dependency/i,'TLS & certificates':/certificate|x509|TLS/i,
  };
  for(const group of failureGroups)group.count=failedDetails.filter(row=>failurePatterns[group.name].test(row.log_text)).length;
  const days=Array.from({length:7},(_,i)=>{const date=new Date();date.setDate(date.getDate()-(6-i));const key=date.toISOString().slice(0,10);const dayRuns=runs.filter(r=>r.startedAt.slice(0,10)===key);return{date:key,total:dayRuns.length,success:dayRuns.filter(r=>r.status==='success').length,failed:dayRuns.filter(r=>r.status==='failed').length};});
  return {summary:{pipelines:db.prepare('SELECT COUNT(*) AS count FROM pipelines WHERE enabled=1').get().count,runs:runs.length,failed:runs.filter(r=>r.status==='failed').length,running:runs.filter(r=>r.status==='running').length,successRate:completed.length?Math.round(success/completed.length*100):0,averageDuration:completed.length?Math.round(completed.reduce((sum,r)=>sum+r.durationSeconds,0)/completed.length):0},runs:runs.slice(0,12),failures:runs.filter(r=>r.status==='failed').slice(0,6),failureGroups:failureGroups.filter(g=>g.count),trend:days,source:{demo:runs.some(r=>r.synthetic),label:'Synthetic demo runs are clearly marked; configure ingestion for real data.'}};
}
