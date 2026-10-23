import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const fixturePath = (ctx, name) => join(ctx.root, '.agents/skills/verify-agent-essential-runtime/scripts/fixtures', name);
const receipts = path => readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
async function prepareHttp(ctx) {
  const requestLog = join(ctx.evidence, 'http-receipts.jsonl');
  const { ready } = await ctx.startFixture(fixturePath(ctx, 'service.mjs'), ['http', requestLog], 'http-fixture');
  ctx.httpOrigin = ready.origin;
  ctx.env.VERIFY_HTTP_ORIGIN = ready.origin;
  ctx.env.VERIFY_FETCH_RECEIPT = join(ctx.evidence, 'fetch-receipts.jsonl');
  ctx.nodeArgs.push('--import', pathToFileURL(fixturePath(ctx, 'fetch-preload.mjs')).href);
}

export const networkFeatures = {
  fetch: {
    toolIds: ['WebFetch'],
    async prepare(ctx) {
      await prepareHttp(ctx);
      ctx.env.AGENT_ESSENTIAL_FETCH_MAX_BYTES = '128';
      ctx.env.AGENT_ESSENTIAL_FETCH_TIMEOUT_MS = '2000';
    },
    async run(ctx) {
      const html = await ctx.call('WebFetch', { url: `${ctx.httpOrigin}/html` });
      assert.equal(html.markdown, 'Fixture guide Visible proof');
      assert.equal(html.status, 200);
      assert.equal(html.truncated, false);
      const large = await ctx.call('WebFetch', { url: `${ctx.httpOrigin}/large` });
      assert.equal(large.markdown, 'x'.repeat(128));
      assert.equal(large.truncated, true);
      const missing = await ctx.call('WebFetch', { url: `${ctx.httpOrigin}/missing` });
      assert.equal(missing.status, 404);
      assert.equal(missing.markdown, 'fixture missing');
      await ctx.call('WebFetch', { url: 'not a URL' }, 'validation_error');
      await ctx.call('WebFetch', { url: 'file:///fixture.txt' }, 'security_denied');
      assert.deepEqual(receipts(join(ctx.evidence, 'http-receipts.jsonl')).filter(row => row.event === 'request').map(row => row.path), ['/html', '/large', '/missing']);
      ctx.save('fetch-results.json', { html, large, missing });
    },
  },
  search: {
    toolIds: ['WebSearch'],
    async prepare(ctx) {
      await prepareHttp(ctx);
      ctx.env.AGENT_ESSENTIAL_SEARCH_API_KEY = 'verification-synthetic-key';
      ctx.env.AGENT_ESSENTIAL_SEARCH_PROVIDER = 'brave';
    },
    async run(ctx) {
      const result = await ctx.call('WebSearch', { search_term: 'fixture guide' });
      assert.deepEqual(result, { results: [
        { title: 'Fixture guide', url: 'https://fixture.invalid/guide', snippet: 'Deterministic search result' },
        { title: 'Fixture without snippet', url: 'https://fixture.invalid/empty', snippet: '' },
      ] });
      await ctx.call('WebSearch', { search_term: 'fail fixture' }, 'execution_failed');
      const requests = receipts(join(ctx.evidence, 'http-receipts.jsonl')).filter(row => row.event === 'request');
      assert.deepEqual(requests.map(row => ({ path: row.path, q: row.query.q, token: row.token })), [
        { path: '/search', q: 'fixture guide', token: 'verification-synthetic-key' },
        { path: '/search', q: 'fail fixture', token: 'verification-synthetic-key' },
      ]);
      const routed = receipts(ctx.env.VERIFY_FETCH_RECEIPT);
      assert.equal(routed.length, 2);
      assert(routed.every(row => new URL(row.original).origin === 'https://api.search.brave.com' && new URL(row.target).origin === ctx.httpOrigin));
      ctx.save('search-results.json', { result, requests, routed, boundary: 'Brave request redirected to localhost; no live provider verification' });
    },
  },
  resources: {
    toolIds: ['FetchMcpResource'],
    async prepare(ctx) {
      const receipt = join(ctx.evidence, 'resource-receipts.jsonl');
      ctx.env.AGENT_ESSENTIAL_MCP_SERVERS = JSON.stringify({ fixture: { command: process.execPath, args: [fixturePath(ctx, 'service.mjs'), 'resource', receipt] } });
    },
    async run(ctx) {
      const args = { server: 'fixture', uri: 'fixture://proof' };
      const result = await ctx.call('FetchMcpResource', args);
      assert.deepEqual(result, { contents: 'Resource fixture proof\n', mimeType: 'text/plain' });
      const downloaded = await ctx.call('FetchMcpResource', { ...args, downloadPath: 'downloads/proof.txt' });
      assert.equal(downloaded.savedPath, join(ctx.workspace, 'downloads/proof.txt'));
      assert.equal(readFileSync(downloaded.savedPath, 'utf8'), 'Resource fixture proof\n');
      await ctx.call('FetchMcpResource', { ...args, uri: 'fixture://missing' }, 'execution_failed');
      const outside = join(ctx.scratch, 'outside-resource.txt');
      writeFileSync(outside, 'protected fixture');
      await ctx.call('FetchMcpResource', { ...args, downloadPath: outside }, 'security_denied');
      assert.equal(readFileSync(outside, 'utf8'), 'protected fixture');
      const reads = receipts(join(ctx.evidence, 'resource-receipts.jsonl')).filter(row => row.event === 'read');
      assert.deepEqual(reads.map(row => row.uri), ['fixture://proof', 'fixture://proof', 'fixture://missing', 'fixture://proof']);
      ctx.save('resource-results.json', { result, downloaded, downloadedText: readFileSync(downloaded.savedPath, 'utf8'), outsideText: readFileSync(outside, 'utf8'), reads });
    },
  },
  task: {
    toolIds: ['Task'],
    async prepare(ctx) {
      ctx.env.AGENT_ESSENTIAL_TASK_EXECUTOR = fixturePath(ctx, 'executor.mjs');
      ctx.env.VERIFY_EXECUTOR_RECEIPT = join(ctx.evidence, 'executor-receipts.jsonl');
    },
    async run(ctx) {
      const args = { description: 'Verify fixture execution', prompt: 'complete fixture', subagent_type: 'fixture' };
      const result = await ctx.call('Task', args);
      assert.equal(result.status, 'complete');
      assert.equal(result.resultText, 'Fixture executor completed\n');
      assert.equal(result.outputFile, join(ctx.state, 'task-outputs', `${result.agentId}.txt`));
      assert.equal(readFileSync(result.outputFile, 'utf8'), result.resultText);
      await ctx.call('Task', { ...args, prompt: 'fail fixture' }, 'execution_failed');
      const executions = receipts(ctx.env.VERIFY_EXECUTOR_RECEIPT);
      assert.deepEqual(executions.map(row => ({ cwd: row.cwd, payload: row.payload })), [
        { cwd: ctx.workspace, payload: args }, { cwd: ctx.workspace, payload: { ...args, prompt: 'fail fixture' } },
      ]);
      const outputs = readdirSync(join(ctx.state, 'task-outputs')).map(name => ({ name, text: readFileSync(join(ctx.state, 'task-outputs', name), 'utf8') }));
      assert.deepEqual(outputs.map(file => file.text).sort(), ['Fixture executor completed\n', 'Fixture executor failure\n']);
      ctx.save('task-results.json', { result, outputs, executions, boundary: 'Local executable fixture; no model delegation' });
    },
  },
};
