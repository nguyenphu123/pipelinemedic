import { authorize, failure, json, readJson } from '../../../lib/http.js';
import { createPipeline, listPipelines } from '../../../lib/pipeline-store.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request) { try { authorize(request); return json({ pipelines:listPipelines() }); } catch (error) { return failure(error); } }
export async function POST(request) { try { authorize(request); return json({ pipeline:createPipeline(await readJson(request)) }, 201); } catch (error) { return failure(error); } }
