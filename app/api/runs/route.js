import { authorize, failure, json, readJson } from '../../../lib/http.js';
import { createRun, listRuns } from '../../../lib/run-store.js';
export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function GET(request){try{authorize(request);const url=new URL(request.url);return json({runs:listRuns({status:url.searchParams.get('status')||undefined,pipelineId:url.searchParams.get('pipelineId')||undefined,limit:url.searchParams.get('limit')||50})});}catch(error){return failure(error);}}
export async function POST(request){try{authorize(request);return json({run:createRun(await readJson(request))},201);}catch(error){return failure(error);}}
