#!/usr/bin/env node
import { appendFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ReadResourceRequestSchema, McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { createContextFromEnv } from '../../../../../dist/src/core/context.js';
import { registerShellJob, getShellJob } from '../../../../../dist/src/infra/shellJobs.js';

const [mode, receipt] = process.argv.slice(2);
const record = event => appendFileSync(receipt, JSON.stringify({ pid: process.pid, ...event }) + '\n');
record({ event: 'start', mode });
process.on('exit', () => record({ event: 'exit', mode }));
const expiry = setTimeout(() => process.exit(2), 60000);
expiry.unref();
if (mode === 'http') {
  const server = createServer((request, response) => {
    const url = new URL(request.url, 'http://fixture');
    record({ event: 'request', path: url.pathname, query: Object.fromEntries(url.searchParams), token: request.headers['x-subscription-token'] });
    if (url.pathname === '/search') {
      response.setHeader('content-type', 'application/json');
      if (url.searchParams.get('q') === 'fail fixture') {
        response.writeHead(503).end(JSON.stringify({ error: 'fixture unavailable' }));
      } else {
        response.end(JSON.stringify({ web: { results: [
          { title: 'Fixture guide', url: 'https://fixture.invalid/guide', description: 'Deterministic search result' },
          { title: 'Fixture without snippet', url: 'https://fixture.invalid/empty' },
        ] } }));
      }
    } else if (url.pathname === '/html') {
      response.setHeader('content-type', 'text/html');
      response.end('<h1>Fixture guide</h1><script>hidden script</script><style>hidden style</style><p>Visible proof</p>');
    } else if (url.pathname === '/large') {
      response.setHeader('content-type', 'text/plain');
      response.end('x'.repeat(256));
    } else {
      response.writeHead(404, { 'content-type': 'text/plain' }).end('fixture missing');
    }
  });
  server.listen(0, '127.0.0.1', () => console.log(JSON.stringify({ origin: `http://127.0.0.1:${server.address().port}` })));
  process.once('SIGTERM', () => server.close(() => process.exit(0)));
} else if (mode === 'resource') {
  const server = new Server({ name: 'verification-resource', version: '1.0.0' }, { capabilities: { resources: {} } });
  server.setRequestHandler(ReadResourceRequestSchema, async request => {
    record({ event: 'read', uri: request.params.uri });
    if (request.params.uri !== 'fixture://proof') throw new McpError(ErrorCode.InvalidParams, 'Fixture resource missing');
    return { contents: [{ uri: request.params.uri, mimeType: 'text/plain', text: 'Resource fixture proof\n' }] };
  });
  await server.connect(new StdioServerTransport());
  process.once('SIGTERM', async () => { await server.close(); process.exit(0); });
} else if (mode === 'shell') {
  const ctx = createContextFromEnv();
  const jobs = [];
  for (const code of [0, 7]) {
    const output = code === 0 ? 'shell fixture success\n' : 'shell fixture failure\n';
    const shellId = registerShellJob(ctx, process.execPath, ['-e', `process.stdout.write(${JSON.stringify(output)}); process.exitCode=${code}`], ctx.workspaceRoot);
    const deadline = Date.now() + 5000;
    while (!getShellJob(ctx, shellId)?.completed) {
      if (Date.now() >= deadline) throw new Error('Fixture shell did not finish');
      await delay(20);
    }
    jobs.push({ shellId, code, output });
    record({ event: 'job-complete', ...getShellJob(ctx, shellId) });
  }
  console.log(JSON.stringify({ jobs }));
  const hold = setInterval(() => {}, 1000);
  process.once('SIGTERM', () => { clearInterval(hold); process.exit(0); });
} else {
  throw new Error(`Unknown fixture mode: ${mode}`);
}
