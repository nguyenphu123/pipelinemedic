import { authorize, failure, json, readJson } from '../../../../lib/http.js';
import { deletePipeline, getPipeline, updatePipeline } from '../../../../lib/pipeline-store.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request,{params}) { try { authorize(request); return json({ pipeline:getPipeline((await params).id) }); } catch (error) { return failure(error); } }
export async function PUT(request,{params}) { try { authorize(request); return json({ pipeline:updatePipeline((await params).id,await readJson(request)) }); } catch (error) { return failure(error); } }
export async function DELETE(request,{params}) { try { authorize(request); deletePipeline((await params).id); return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}}); } catch (error) { return failure(error); } }
