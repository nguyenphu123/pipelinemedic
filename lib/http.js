import { timingSafeEqual } from 'node:crypto';
import { DiagnosisError } from './schema.js';

export function authorize(request) {
  const origin = request.headers.get('origin');
  const url = new URL(request.url);
  // Next may normalize request.url to localhost even when the browser uses 127.0.0.1.
  // Use the incoming Host; never trust arbitrary forwarded headers as an origin override.
  const host = request.headers.get('host') || url.host;
  const secret = process.env.PIPELINEMEDIC_ACCESS_TOKEN;
  if (!secret && !['localhost', '127.0.0.1', '[::1]'].includes(new URL(`http://${host}`).hostname)) {
    throw new DiagnosisError('Remote access requires a configured workspace access token.', 403);
  }
  const expectedOrigin = process.env.PIPELINEMEDIC_ORIGIN || `${url.protocol}//${host}`;
  if (origin && origin !== expectedOrigin) throw new DiagnosisError('Cross-origin requests are not allowed.', 403);
  if (secret) {
    const actual = Buffer.from(request.headers.get('authorization') || '');
    const expected = Buffer.from(`Bearer ${secret}`);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new DiagnosisError('Enter the server access token in Connection settings.', 401);
  }
}

export async function readJson(request) {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new DiagnosisError('Send a JSON request.', 415);
  const reader = request.body?.getReader();
  if (!reader) throw new DiagnosisError('A request body is required.');
  let size = 0; const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 800_000) { await reader.cancel(); throw new DiagnosisError('The request is too large.', 413); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new DiagnosisError('The request contains invalid JSON.'); }
}

export function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}
export function failure(error) {
  return json({ error: error instanceof DiagnosisError ? error.message : 'An unexpected server error occurred. Please retry.' }, error instanceof DiagnosisError ? error.status : 500);
}
