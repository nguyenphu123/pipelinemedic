import { diagnose } from '../../../../../lib/diagnose.js';
import { authorize, failure, json, readJson } from '../../../../../lib/http.js';
import { getRun } from '../../../../../lib/run-store.js';
import { DiagnosisError } from '../../../../../lib/schema.js';
export const runtime='nodejs'; export const dynamic='force-dynamic';
let active=0;
export async function POST(request,{params}){
  let acquired=false;
  try{
    authorize(request);if(active>=3)throw new DiagnosisError('The server is handling other diagnoses. Try again shortly.',429);
    const body=await readJson(request);if(!['rules','cloud','ollama'].includes(body.provider))throw new DiagnosisError('Choose rules, cloud or ollama.');
    const run=getRun((await params).id);active+=1;acquired=true;
    const result=await diagnose({logText:run.logText,configText:run.configText.slice(0,30000),pipelineType:['gitlab','jenkins','github'].includes(run.platform)?run.platform:'other',runnerLocation:run.runnerLocation,deploymentTarget:'unknown',provider:body.provider});
    return json({...result,run:{id:run.id,runNumber:run.runNumber,pipelineId:run.pipelineId,pipelineName:run.pipelineName,branch:run.branch,commitSha:run.commitSha,synthetic:run.synthetic}});
  }catch(error){return failure(error);}finally{if(acquired)active-=1;}
}
