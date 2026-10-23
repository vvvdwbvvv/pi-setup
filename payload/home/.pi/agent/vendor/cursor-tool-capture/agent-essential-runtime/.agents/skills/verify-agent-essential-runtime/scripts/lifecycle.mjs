import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

function deadline(promise, milliseconds, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), milliseconds); }),
  ]).finally(() => clearTimeout(timer));
}

export async function startFixture(ctx, script, args, label) {
  const child = spawn(process.execPath, [script, ...args], { cwd: ctx.root, env: ctx.env, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  const closed = new Promise(resolve => child.once('close', (code, signal) => resolve({ code, signal })));
  let resolveReady;
  let rejectReady;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  child.once('error', rejectReady);
  child.once('exit', code => rejectReady(new Error(`${label} exited before readiness: ${code}`)));
  child.stdout.on('data', chunk => {
    stdout += chunk.toString();
    if (stdout.includes('\n')) {
      try { resolveReady(JSON.parse(stdout.split('\n')[0])); } catch (error) { rejectReady(error); }
    }
  });
  child.stderr.on('data', chunk => { stderr += chunk.toString(); });
  ctx.addCleanup(async () => {
    try {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
      try { await deadline(closed, 2000, `${label} shutdown timed out`); }
      catch {
        child.kill('SIGKILL');
        await deadline(closed, 2000, `${label} could not be reaped`);
      }
      assert(child.exitCode !== null || child.signalCode !== null, `${label} is still running`);
    } finally {
      writeFileSync(join(ctx.evidence, `${label}-stdout.txt`), stdout);
      writeFileSync(join(ctx.evidence, `${label}-stderr.txt`), stderr);
      ctx.save(`${label}-process.json`, { pid: child.pid, exitCode: child.exitCode, signal: child.signalCode });
    }
  });
  return { child, ready: await deadline(ready, 10000, `${label} readiness timed out`) };
}
