export async function GET() {
  return Response.json({ status: 'ok', service: 'pipelinemedic' }, { headers: { 'Cache-Control': 'no-store' } });
}
