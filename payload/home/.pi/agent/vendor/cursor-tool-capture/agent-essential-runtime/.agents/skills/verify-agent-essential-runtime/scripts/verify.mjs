#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { coreFeatures } from './core-features.mjs';
import { localFeatures } from './local-features.mjs';
import { networkFeatures } from './network-features.mjs';
import { startFixture } from './lifecycle.mjs';

const script = fileURLToPath(import.meta.url);
const root = resolve(dirname(script), '../../../..');
const cli = join(root, 'dist/src/surfaces/cli/main.js');
const features = { ...coreFeatures, ...localFeatures, ...networkFeatures };
const feature = process.argv[2] ?? 'todos';
const surface = process.argv[3] ?? 'cli';
assert(feature === 'all' || Object.hasOwn(features, feature), `Unknown feature: ${feature}`);
assert(['cli', 'mcp'].includes(surface) || (feature === 'all' && surface === 'both'), 'Surface must be cli or mcp; all also accepts both');

if (feature === 'all') {
  const evidence = mkdtempSync(join(realpathSync(tmpdir()), 'verify-agent-essential-runtime-suite-'));
  const runs = [];
  const expected = JSON.parse(readFileSync(join(root, 'contracts/tools.json'), 'utf8')).tools.map(tool => tool.toolId).filter(id => id !== 'GenerateImage').sort();
  const surfaces = surface === 'both' ? ['cli', 'mcp'] : [surface];
  console.log(`Suite evidence: ${evidence}`);
  for (const target of surfaces) {
    for (const name of Object.keys(features).filter(id => id !== 'doctor')) {
      const result = spawnSync(process.execPath, [script, name, target], { cwd: root, encoding: 'utf8', timeout: 120000 });
      writeFileSync(join(evidence, `${name}-${target}.stdout.txt`), result.stdout ?? '');
      writeFileSync(join(evidence, `${name}-${target}.stderr.txt`), result.stderr ?? '');
      const path = result.stdout?.match(/^Evidence: (.+)$/m)?.[1];
      const reportPath = path && join(path, 'report.json');
      const report = reportPath && existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, 'utf8')) : undefined;
      const passed = result.status === 0 && report?.passed === true && report?.scratchRemoved === true;
      runs.push({ feature: name, surface: target, passed, status: result.status, evidence: path, toolIds: passed ? report.verifiedToolIds : [], error: report?.error ?? result.error?.message });
      console.log(`${passed ? 'PASS' : 'FAIL'} ${name} ${target}${path ? ` ${path}` : ''}`);
    }
  }
  const coverage = surfaces.map(target => ({ surface: target, toolIds: [...new Set(runs.filter(run => run.surface === target && run.passed).flatMap(run => run.toolIds))].sort() }));
  const passed = runs.every(run => run.passed) && coverage.every(row => JSON.stringify(row.toolIds) === JSON.stringify(expected));
  const report = { passed, excluded: ['GenerateImage'], expectedToolIds: expected, coverage, runs };
  writeFileSync(join(evidence, 'suite-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed, evidence, coverage, excluded: report.excluded }, null, 2));
  process.exitCode = passed ? 0 : 1;
} else {
  await runFeature();
}

async function runFeature() {
  const evidence = mkdtempSync(join(realpathSync(tmpdir()), 'verify-agent-essential-runtime-'));
  const scratch = join(evidence, 'scratch');
  const workspace = join(scratch, 'workspace');
  const state = join(scratch, 'state');
  const home = join(scratch, 'home');
  for (const path of [workspace, state, home]) mkdirSync(path, { recursive: true });
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('AGENT_ESSENTIAL_') && !key.startsWith('VERIFY_') && key !== 'NODE_OPTIONS' && !/^(https?|all|no)_proxy$/i.test(key)));
  Object.assign(env, { AGENT_ESSENTIAL_WORKSPACE_ROOT: workspace, AGENT_ESSENTIAL_STATE_DIR: state, AGENT_ESSENTIAL_ALLOW_OUTSIDE_WORKSPACE: 'false', HOME: home });
  const nodeArgs = [];
  const transcript = [];
  const calls = [];
  const cleanups = [];
  const report = { feature, surface, evidence, workspace, state, node: process.version, passed: false, excluded: ['GenerateImage'] };
  let client;
  let transport;
  function save(name, value) {
    assert.equal(name, name.split('/').at(-1), 'Evidence filenames must be local names');
    writeFileSync(join(evidence, name), JSON.stringify(value, null, 2) + '\n');
  }
  function cliCommand(args, expected = 0) {
    const command = [process.execPath, ...nodeArgs, cli, ...args];
    const result = spawnSync(command[0], command.slice(1), { cwd: root, env, encoding: 'utf8', timeout: 15000 });
    transcript.push({ command, status: result.status, stdout: result.stdout, stderr: result.stderr, error: result.error?.message });
    save('transcript.json', transcript);
    assert.equal(result.status, expected, result.stderr || result.error?.message);
    return JSON.parse(result.stdout);
  }
  async function call(id, args, code) {
    assert.notEqual(id, 'GenerateImage', 'GenerateImage is explicitly excluded');
    let result;
    if (surface === 'cli') result = cliCommand(['call', id, JSON.stringify(args)], code ? 1 : 0);
    else {
      const response = await client.callTool({ name: `essential_${id}`, arguments: args });
      transcript.push({ method: 'tools/call', name: `essential_${id}`, arguments: args, response });
      save('transcript.json', transcript);
      result = JSON.parse(response.content[0].text);
      assert.equal(response.isError, Boolean(code));
    }
    assert.equal(result.ok, !code, JSON.stringify(result));
    if (code) assert.equal(result.code, code);
    calls.push({ toolId: id, expectedCode: code ?? 'ok' });
    return result.data;
  }
  function stored(name) {
    const data = JSON.parse(readFileSync(join(state, name), 'utf8'));
    save(name, data);
    return data;
  }
  const ctx = { root, cli, surface, evidence, scratch, workspace, state, env, nodeArgs, save, call, stored, addCleanup: cleanup => cleanups.push(cleanup) };
  ctx.startFixture = (path, args, label) => startFixture(ctx, path, args, label);
  console.log(`Evidence: ${evidence}`);
  save('transcript.json', transcript);
  try {
    assert(Number(process.versions.node.split('.')[0]) >= 20, 'Node 20+ required');
    assert(existsSync(cli), 'Run npm install && npm run build first');
    await features[feature].prepare?.(ctx);
    report.packageVersion = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
    report.cliSha256 = createHash('sha256').update(readFileSync(cli)).digest('hex');
    const tools = cliCommand(['list']);
    const manifest = JSON.parse(readFileSync(join(root, 'contracts/tools.json'), 'utf8')).tools;
    assert.deepEqual(tools, manifest);
    save('doctor.json', { healthy: true, cli, version: report.packageVersion, cliSha256: report.cliSha256, workspace, state, toolIds: tools.map(tool => tool.toolId), nodeArgs });
    if (surface === 'mcp') {
      transport = new StdioClientTransport({ command: process.execPath, args: [...nodeArgs, cli, 'mcp'], cwd: root, env, stderr: 'pipe' });
      client = new Client({ name: 'verify-agent-essential-runtime', version: '1.0.0' });
      transport.stderr?.on('data', chunk => { transcript.push({ stderr: chunk.toString() }); save('transcript.json', transcript); });
      await client.connect(transport);
      const listed = await client.listTools();
      transcript.push({ method: 'tools/list', response: listed });
      save('transcript.json', transcript);
      assert.deepEqual(listed.tools.map(tool => tool.name), tools.map(tool => tool.mcpName));
    }
    await features[feature].run?.(ctx);
    const verified = [...new Set(calls.filter(call => call.expectedCode === 'ok').map(call => call.toolId))].sort();
    assert.deepEqual(verified, [...features[feature].toolIds].sort());
    report.verifiedToolIds = verified;
    report.passed = true;
  } catch (error) {
    report.error = error.stack;
    process.exitCode = 1;
  } finally {
    const teardownErrors = [];
    try {
      if (client) await client.close();
      else if (transport) await transport.close();
    } catch (error) { teardownErrors.push(String(error)); }
    for (const cleanup of cleanups.reverse()) {
      try { await cleanup(); } catch (error) { teardownErrors.push(String(error)); }
    }
    try { rmSync(scratch, { recursive: true, force: true }); } catch (error) { teardownErrors.push(String(error)); }
    report.scratchRemoved = !existsSync(scratch);
    if (teardownErrors.length || !report.scratchRemoved) {
      report.teardownErrors = teardownErrors;
      report.passed = false;
      process.exitCode = 1;
    }
    report.calls = calls;
    save('report.json', report);
    assert(existsSync(join(evidence, 'transcript.json')));
    console.log(JSON.stringify(report, null, 2));
  }
}
