import { getProviderStatus } from '../../../lib/providers.js';
import { authorize, json, failure } from '../../../lib/http.js';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  try { authorize(request); return json({ providers: getProviderStatus() }); }
  catch (error) { return failure(error); }
}
