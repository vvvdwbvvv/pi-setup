import assert from 'node:assert/strict';
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { delimiter, join } from 'node:path';

const scripts = root => join(root, '.agents/skills/verify-agent-essential-runtime/scripts');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const lines = path => readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));

export const localFeatures = {
  notebook: {
    toolIds: ['EditNotebook'],
    async run(ctx) {
      const path = join(ctx.workspace, 'proof.ipynb');
      const args = { target_notebook: path, cell_idx: 0, is_new_cell: true, cell_language: 'python', old_string: '', new_string: 'print("before")\n' };
      await ctx.call('EditNotebook', args);
      const initial = read(path);
      assert.equal(initial.nbformat, 4);
      assert.deepEqual(initial.cells.map(cell => cell.source.join('')), ['print("before")\n']);
      ctx.save('notebook-before.json', initial);
      await ctx.call('EditNotebook', { ...args, cell_idx: 1, cell_language: 'markdown', new_string: '# Fixture proof' });
      await ctx.call('EditNotebook', { ...args, is_new_cell: false, old_string: args.new_string, new_string: 'print("after")\n' });
      const updated = read(path);
      assert.deepEqual(updated.cells.map(cell => ({ type: cell.cell_type, source: cell.source.join('') })), [
        { type: 'code', source: 'print("after")\n' }, { type: 'markdown', source: '# Fixture proof' },
      ]);
      const beforeRejected = readFileSync(path, 'utf8');
      await ctx.call('EditNotebook', { ...args, is_new_cell: false, old_string: 'does not match' }, 'execution_failed');
      await ctx.call('EditNotebook', { ...args, is_new_cell: false, cell_idx: 99 }, 'not_found');
      const outside = join(ctx.scratch, 'outside.ipynb');
      await ctx.call('EditNotebook', { ...args, target_notebook: outside }, 'security_denied');
      assert.equal(existsSync(outside), false);
      assert.equal(readFileSync(path, 'utf8'), beforeRejected);
      ctx.save('notebook-after.json', read(path));
    },
  },
  mode: {
    toolIds: ['SwitchMode'],
    async run(ctx) {
      const planned = await ctx.call('SwitchMode', { target_mode_id: 'plan', explanation: 'Fixture verification' });
      assert.equal(planned.previous, 'agent');
      assert.equal(planned.mode, 'plan');
      assert.deepEqual(ctx.stored('session.json'), { mode: 'plan' });
      ctx.save('session-before.json', { mode: 'plan' });
      const active = await ctx.call('SwitchMode', { target_mode_id: 'agent' });
      assert.equal(active.previous, 'plan');
      assert.equal(active.mode, 'agent');
      await ctx.call('SwitchMode', { target_mode_id: 'invalid-fixture-mode' }, 'validation_error');
      assert.deepEqual(ctx.stored('session.json'), { mode: 'agent' });
    },
  },
  lints: {
    toolIds: ['ReadLints'],
    async prepare(ctx) {
      const bin = join(ctx.scratch, 'bin');
      mkdirSync(bin);
      const shim = join(bin, 'npx');
      copyFileSync(join(scripts(ctx.root), 'fixtures/lint-command.mjs'), shim);
      chmodSync(shim, 0o755);
      ctx.env.PATH = bin + delimiter + ctx.env.PATH;
      ctx.env.VERIFY_ESLINT = join(ctx.root, 'node_modules/eslint/bin/eslint.js');
      ctx.env.VERIFY_LINT_RECEIPT = join(ctx.evidence, 'lint-receipts.jsonl');
      assert(existsSync(ctx.env.VERIFY_ESLINT), 'Install the pinned ESLint development dependency');
    },
    async run(ctx) {
      const noConfig = await ctx.call('ReadLints', {});
      assert.deepEqual(noConfig.diagnostics, []);
      assert.match(noConfig.warning, /No eslint configuration/);
      assert.equal(existsSync(ctx.env.VERIFY_LINT_RECEIPT), false);
      writeFileSync(join(ctx.workspace, 'eslint.config.js'), 'module.exports = [{ files: ["**/*.js"], rules: { "no-debugger": "error" } }];\n');
      const bad = join(ctx.workspace, 'bad.js');
      const clean = join(ctx.workspace, 'clean.js');
      writeFileSync(bad, 'debugger;\n');
      writeFileSync(clean, 'const proof = 1;\n');
      const expected = [{ path: bad, line: 1, column: 1, message: "Unexpected 'debugger' statement.", severity: 'error' }];
      const diagnostic = await ctx.call('ReadLints', { paths: [bad] });
      assert.deepEqual(diagnostic, { diagnostics: expected });
      const cleanResult = await ctx.call('ReadLints', { paths: [clean] });
      assert.deepEqual(cleanResult, { diagnostics: [] });
      const whole = await ctx.call('ReadLints', {});
      assert.deepEqual(whole, { diagnostics: expected });
      const receipts = lines(ctx.env.VERIFY_LINT_RECEIPT);
      assert.deepEqual(receipts.map(receipt => receipt.status), [1, 0, 1]);
      assert(receipts.every(receipt => receipt.cwd === ctx.workspace && receipt.executable === ctx.env.VERIFY_ESLINT));
      assert.equal(readFileSync(bad, 'utf8'), 'debugger;\n');
      assert.equal(readFileSync(clean, 'utf8'), 'const proof = 1;\n');
      ctx.save('lint-results.json', { diagnostic, cleanResult, whole, receipts });
    },
  },
  shell: {
    toolIds: ['AwaitShell'],
    async prepare(ctx) {
      const receipt = join(ctx.evidence, 'shell-receipts.jsonl');
      const fixture = await ctx.startFixture(join(scripts(ctx.root), 'fixtures/service.mjs'), ['shell', receipt], 'shell-owner');
      ctx.shellJobs = fixture.ready.jobs;
    },
    async run(ctx) {
      assert.deepEqual(await ctx.call('AwaitShell', { block_until_ms: 1 }), { completed: false, sleptMs: 1 });
      await ctx.call('AwaitShell', { shell_id: 'missing-fixture-job', block_until_ms: 10 }, 'not_found');
      for (const job of ctx.shellJobs) {
        const result = await ctx.call('AwaitShell', { shell_id: job.shellId, block_until_ms: 100 });
        assert.deepEqual(result, { completed: true, exitCode: job.code, output: job.output });
        const persisted = ctx.stored('shell-jobs.json')[job.shellId];
        assert.equal(persisted.completed, true);
        assert.equal(persisted.exitCode, job.code);
        assert.equal(readFileSync(persisted.outputPath, 'utf8'), job.output);
      }
      const success = ctx.shellJobs[0];
      const matched = await ctx.call('AwaitShell', { shell_id: success.shellId, block_until_ms: 100, pattern: '^shell fixture success$' });
      assert.equal(matched.matched, true);
      assert.equal(matched.output, success.output);
      await ctx.call('AwaitShell', { shell_id: success.shellId, block_until_ms: 100, pattern: '[' }, 'validation_error');
      ctx.save('shell-results.json', { jobs: ctx.shellJobs, matched });
    },
  },
};
