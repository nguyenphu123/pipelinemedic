import { authorize, failure, json } from '../../../../lib/http.js';
import { getRun } from '../../../../lib/run-store.js';
export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function GET(request,{params}){try{authorize(request);return json({run:getRun((await params).id)});}catch(error){return failure(error);}}
