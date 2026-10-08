import { diagnose } from '../../../lib/diagnose.js';
import { authorize, readJson, json, failure } from '../../../lib/http.js';
import { DiagnosisError } from '../../../lib/schema.js';
export const runtime = 'nodejs';
let active = 0;

export async function POST(request) {
  let acquired = false;
  try {
    authorize(request);
    if (active >= 3) throw new DiagnosisError('The server is handling other diagnoses. Try again shortly.', 429);
    active += 1; acquired = true;
    return json(await diagnose(await readJson(request)));
  } catch (error) { return failure(error); }
  finally { if (acquired) active -= 1; }
}
