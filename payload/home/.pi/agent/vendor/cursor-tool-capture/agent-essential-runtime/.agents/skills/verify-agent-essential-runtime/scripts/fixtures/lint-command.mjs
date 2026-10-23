#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const args = process.argv.slice(2);
assert.deepEqual(args.slice(0, 3), ['eslint', '--format', 'json']);
const result = spawnSync(process.execPath, [process.env.VERIFY_ESLINT, ...args.slice(1)], { cwd: process.cwd(), env: process.env, encoding: 'utf8' });
appendFileSync(process.env.VERIFY_LINT_RECEIPT, JSON.stringify({ args, cwd: process.cwd(), executable: process.env.VERIFY_ESLINT, status: result.status, stdout: result.stdout, stderr: result.stderr, error: result.error?.message }) + '\n');
process.stdout.write(result.stdout ?? '');
process.stderr.write(result.stderr ?? '');
process.exitCode = result.status ?? 1;
