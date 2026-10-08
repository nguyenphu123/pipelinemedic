import { authorize, failure, json } from '../../../lib/http.js';
import { getDashboard } from '../../../lib/run-store.js';
export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function GET(request){try{authorize(request);return json(getDashboard());}catch(error){return failure(error);}}
