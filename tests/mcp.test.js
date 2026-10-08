import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';

test('a real MCP client discovers and calls all control-plane tools over stdio', { timeout: 15000 }, async () => {
  const client = new Client({ name: 'pipelinemedic-test', version: '1.0.0' });
  const transport = new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL('../mcp/server.js', import.meta.url))], stderr: 'pipe' });
  try {
    await client.connect(transport);
    const list = await client.listTools();
    assert.deepEqual(list.tools.map(t => t.name).sort(), ['diagnose_pipeline', 'diagnose_run', 'list_pipeline_runs', 'list_sample_cases']);
    const fixtures = await client.callTool({ name: 'list_sample_cases', arguments: {} });
    const cases = JSON.parse(fixtures.content[0].text);
    assert.equal(cases.synthetic, true);
    assert.equal(cases.cases.length, 6);
    const result = await client.callTool({ name: 'diagnose_pipeline', arguments: { logText: 'npm: not found', provider: 'rules' } });
    assert.equal(result.isError, undefined);
    assert.equal(result.structuredContent.category, 'environment');
    assert.equal(result.structuredContent.causes[0].evidence[0].text, 'npm: not found');
    const runs = await client.callTool({ name: 'list_pipeline_runs', arguments: { status: 'failed', limit: 3 } });
    assert.equal(runs.structuredContent.count, 3);
    assert.ok(runs.structuredContent.runs.every(run => run.status === 'failed'));
    const stored = await client.callTool({ name: 'diagnose_run', arguments: { runId: runs.structuredContent.runs[0].id, provider: 'rules' } });
    assert.equal(stored.isError, undefined);
    assert.equal(stored.structuredContent.run.id, runs.structuredContent.runs[0].id);
    assert.ok(stored.structuredContent.causes.length > 0);
    const invalid = await client.callTool({ name: 'diagnose_pipeline', arguments: { logText: '' } });
    assert.equal(invalid.isError, true);
  } finally { await client.close(); }
});
